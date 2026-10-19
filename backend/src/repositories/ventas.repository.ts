import type { PoolConnection } from 'mysql2/promise';
import { exec, like, q, q1, type Conn } from '../db.js';

export interface CabeceraVenta {
  id_cliente: string | null;
  id_metodo_pago: string;
  observaciones: string | null;
}

// Totales por vw_totales_venta (base gravable / IVA / total, nunca en JS).
const SELECT_VENTA = `
  SELECT v.id_venta, v.id_cliente, CONCAT_WS(' ', c.nombres, c.apellidos) AS cliente,
    c.tipo_documento AS cliente_tipo_documento, c.numero_documento AS cliente_numero_documento,
    v.id_jornada, v.id_usuario, CONCAT_WS(' ', u.nombres, u.apellidos) AS usuario,
    v.id_metodo_pago, mp.nombre AS metodo_pago, v.fecha_hora_venta, v.estado, v.observaciones,
    t.base_gravable, t.iva, t.total_venta
  FROM venta v
  JOIN vw_totales_venta t ON t.id_venta = v.id_venta
  LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
  JOIN usuario u ON u.id_usuario = v.id_usuario
  JOIN metodo_pago mp ON mp.id_metodo_pago = v.id_metodo_pago`;

const COLS_LINEA = `id_venta, id_producto, producto, categoria, id_lote, fecha_vencimiento, cantidad,
  precio_unitario_venta, porcentaje_impuesto_aplicado, subtotal,
  precio_unitario_venta / (1 + porcentaje_impuesto_aplicado / 100) AS precio_sin_iva`;

// Lote vendible: con stock y sin vencer (si el producto maneja vencimiento),
// el mismo criterio que aplica sp_validar_detalle_venta.
const LOTE_VENDIBLE = `cantidad_disponible > 0
  AND (NOT maneja_vencimiento OR fecha_vencimiento IS NULL OR fecha_vencimiento >= CURDATE())`;

export const ventasRepo = {
  // Primero se eligen las 500 ventas de la página y solo para ellas se
  // calculan los totales: calcularlos antes de ordenar recorría todo el
  // historial (~6 s con un año de ventas).
  async ventas(f: { q?: string; desde?: string; hasta?: string; estado?: string; id_usuario?: string; id_jornada?: string }) {
    const ventas = await q(
      `${SELECT_VENTA}
       JOIN (SELECT v.id_venta FROM venta v LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
             WHERE (? IS NULL OR DATE(v.fecha_hora_venta) >= ?) AND (? IS NULL OR DATE(v.fecha_hora_venta) <= ?)
               AND (? IS NULL OR v.estado = ?) AND (? IS NULL OR v.id_usuario = ?) AND (? IS NULL OR v.id_jornada = ?)
               AND (? IS NULL OR CONCAT_WS(' ', v.id_venta, c.nombres, c.apellidos, c.numero_documento) LIKE ?)
             ORDER BY v.fecha_hora_venta DESC, v.id_venta DESC LIMIT 500) pagina ON pagina.id_venta = v.id_venta
       ORDER BY v.fecha_hora_venta DESC, v.id_venta DESC`,
      [f.desde ?? null, f.desde ?? null, f.hasta ?? null, f.hasta ?? null, f.estado ?? null, f.estado ?? null,
        f.id_usuario ?? null, f.id_usuario ?? null, f.id_jornada ?? null, f.id_jornada ?? null, like(f.q), like(f.q)],
    );
    if (!ventas.length) return [];
    const lineas = await q(`SELECT ${COLS_LINEA} FROM vw_detalle_venta WHERE id_venta IN (?)`, [
      ventas.map((v) => v.id_venta),
    ]);
    return ventas.map((v) => ({ ...v, detalles: lineas.filter((l) => l.id_venta === v.id_venta) }));
  },

  // Recibo / detalle (CU_06_08 y factura CU_06_04).
  async venta(id: string, conn?: Conn) {
    const venta = await q1(`${SELECT_VENTA} WHERE v.id_venta = ?`, [id], conn);
    if (!venta) return undefined;
    const detalles = await q(
      `SELECT ${COLS_LINEA} FROM vw_detalle_venta WHERE id_venta = ? ORDER BY producto, fecha_vencimiento`,
      [id],
      conn,
    );
    // Desglose por tarifa de IVA (obligatorio en la factura cuando hay varias).
    const desgloseIva = await q(
      `SELECT porcentaje_impuesto_aplicado AS tarifa,
         SUM(subtotal / (1 + porcentaje_impuesto_aplicado / 100)) AS base_gravable,
         SUM(subtotal - subtotal / (1 + porcentaje_impuesto_aplicado / 100)) AS iva
       FROM vw_detalle_venta WHERE id_venta = ? GROUP BY porcentaje_impuesto_aplicado ORDER BY tarifa`,
      [id],
      conn,
    );
    return { ...venta, detalles, desglose_iva: desgloseIva };
  },

  // Catálogo del punto de venta: productos activos con su stock vendible, IVA
  // y verificación de edad de la categoría, y el próximo vencimiento (FEFO).
  catalogo: (texto?: string) =>
    q(
      `SELECT p.id_producto, p.nombre, c.nombre AS categoria, c.porcentaje_iva, c.requiere_verificacion_edad,
         p.precio_venta_actual, um.nombre AS unidad_medida,
         COALESCE(s.disponible, 0) AS disponible, s.proximo_vencimiento
       FROM producto p
       JOIN categoria c ON c.id_categoria = p.id_categoria
       JOIN unidad_medida um ON um.id_unidad_medida = p.id_unidad_medida
       LEFT JOIN (SELECT id_producto, SUM(cantidad_disponible) AS disponible,
                    MIN(fecha_vencimiento) AS proximo_vencimiento
                  FROM vw_stock_lotes WHERE ${LOTE_VENDIBLE} GROUP BY id_producto) s
         ON s.id_producto = p.id_producto
       WHERE p.estado AND (? IS NULL OR CONCAT_WS(' ', p.id_producto, p.nombre, c.nombre) LIKE ?)
       ORDER BY p.nombre`,
      [like(texto), like(texto)],
    ),

  // Llamar con la jornada abierta bloqueada en exclusivo: las ventas nuevas se
  // crean de a una, así basta leer el último código por índice (nextId
  // recorría y bloqueaba todas las ventas: ~0,4 s con un año de historial).
  // VTA-NNNNNN tiene ancho fijo (ck_venta_id): el orden de texto es el numérico.
  async crear(conn: PoolConnection, v: CabeceraVenta, idJornada: string, idUsuario: string) {
    const ultimo = await q1<{ id_venta: string }>('SELECT id_venta FROM venta ORDER BY id_venta DESC LIMIT 1', [], conn);
    const id = `VTA-${String(Number(ultimo?.id_venta.slice(4) ?? 0) + 1).padStart(6, '0')}`;
    await exec(
      `INSERT INTO venta (id_venta, id_cliente, id_jornada, id_usuario, id_metodo_pago, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, v.id_cliente, idJornada, idUsuario, v.id_metodo_pago, v.observaciones],
      conn,
    );
    return id;
  },

  estadoParaEditar: (conn: Conn, id: string) =>
    q1<{ estado: string }>('SELECT estado FROM venta WHERE id_venta = ? FOR UPDATE', [id], conn),

  actualizarCabecera: (conn: Conn, id: string, v: CabeceraVenta) =>
    exec('UPDATE venta SET id_cliente = ?, id_metodo_pago = ?, observaciones = ? WHERE id_venta = ?', [
      v.id_cliente, v.id_metodo_pago, v.observaciones, id,
    ], conn),

  // Re-dispara trg_validar_detalle_venta_upd en cada línea (los BEFORE UPDATE
  // corren aunque el valor no cambie): revalida edad del nuevo cliente,
  // vencimiento y jornada sin duplicar esas reglas aquí.
  revalidarLineas: (conn: Conn, id: string) =>
    exec('UPDATE detalle_venta SET cantidad = cantidad WHERE id_venta = ?', [id], conn),

  producto: (conn: Conn, idProducto: string) =>
    q1<{ estado: boolean; precio_venta_actual: number; nombre: string }>(
      'SELECT estado, precio_venta_actual, nombre FROM producto WHERE id_producto = ?',
      [idProducto],
      conn,
    ),

  cantidadProducto: async (conn: Conn, idVenta: string, idProducto: string) =>
    Number((await q1(
      `SELECT COALESCE(SUM(dv.cantidad), 0) AS n FROM detalle_venta dv JOIN lote l ON l.id_lote = dv.id_lote
       WHERE dv.id_venta = ? AND l.id_producto = ?`,
      [idVenta, idProducto],
      conn,
    )).n),

  // Solo se llama con la venta PENDIENTE bloqueada (detalle_venta no tiene
  // trigger de DELETE: la regla vive en el controlador).
  borrarLineasProducto: (conn: Conn, idVenta: string, idProducto: string) =>
    exec(
      `DELETE dv FROM detalle_venta dv JOIN lote l ON l.id_lote = dv.id_lote
       WHERE dv.id_venta = ? AND l.id_producto = ?`,
      [idVenta, idProducto],
      conn,
    ),

  // Primer paso de todo cambio de cantidad: las ventas concurrentes del mismo
  // producto se serializan aquí, antes de tocar detalle_venta (tomar el
  // bloqueo después de borrar líneas provoca interbloqueos).
  bloquearLotes: (conn: Conn, idProducto: string) =>
    q('SELECT id_lote FROM lote WHERE id_producto = ? ORDER BY id_lote FOR UPDATE', [idProducto], conn),

  // Lotes vendibles en orden FEFO: primero el que vence antes, los que no
  // vencen al final. Llamar con los lotes ya bloqueados.
  // Para un solo producto se usa fn_stock_lote lote por lote (son pocos): la
  // vista vw_stock_lotes agrupa todo el historial y aquí corre bajo bloqueo.
  lotesVendiblesFefo: (conn: Conn, idProducto: string) =>
    q<{ id_lote: string; cantidad_disponible: number }>(
      `SELECT id_lote, cantidad_disponible FROM (
         SELECT l.id_lote, l.fecha_vencimiento, p.maneja_vencimiento, fn_stock_lote(l.id_lote) AS cantidad_disponible
         FROM lote l JOIN producto p ON p.id_producto = l.id_producto WHERE l.id_producto = ?) s
       WHERE ${LOTE_VENDIBLE}
       ORDER BY fecha_vencimiento IS NULL, fecha_vencimiento, id_lote`,
      [idProducto],
      conn,
    ),

  // El trigger valida stock, jornada, vencimiento y edad, y congela el IVA.
  insertarLinea: (conn: Conn, idVenta: string, idLote: string, cantidad: number, precio: number) =>
    exec('INSERT INTO detalle_venta (id_venta, id_lote, cantidad, precio_unitario_venta) VALUES (?, ?, ?, ?)', [
      idVenta, idLote, cantidad, precio,
    ], conn),

  // PENDIENTE -> COMPLETADA (exige detalle, total > 0, jornada/cliente/usuario activos).
  completar: (conn: Conn, id: string) => exec('CALL sp_completar_venta(?)', [id], conn),

  // Solo una venta PENDIENTE (nunca COMPLETADA); libera el stock reservado.
  anular: (conn: Conn, id: string) =>
    exec("UPDATE venta SET estado = 'ANULADA' WHERE id_venta = ? AND estado = 'PENDIENTE'", [id], conn),

  // "Mi resumen" del empleado en la jornada abierta (app móvil).
  resumenUsuarioJornada: (idUsuario: string, idJornada: string) =>
    q(
      `SELECT tv.estado, COUNT(*) AS ventas, COALESCE(SUM(tv.total_venta), 0) AS total
       FROM vw_totales_venta tv JOIN venta v ON v.id_venta = tv.id_venta
       WHERE v.id_usuario = ? AND v.id_jornada = ? GROUP BY tv.estado`,
      [idUsuario, idJornada],
    ),
};
