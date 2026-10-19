import type { PoolConnection } from 'mysql2/promise';
import { exec, like, nextId, q, q1, type Conn } from '../db.js';

export interface CabeceraCompra {
  id_proveedor: string;
  id_metodo_pago: string;
  numero_factura_proveedor: string | null;
  fecha_compra: string;
  observaciones: string | null;
}

export interface LineaCompra {
  id_producto: string;
  fecha_vencimiento: string | null;
  cantidad: number;
  precio_unitario_compra: number;
}

// Totales por vw_totales_compra (el total nunca se guarda).
const SELECT_COMPRA = `
  SELECT c.id_compra, c.id_proveedor, pr.razon_social AS proveedor, c.id_usuario,
    CONCAT_WS(' ', u.nombres, u.apellidos) AS usuario, c.id_metodo_pago, mp.nombre AS metodo_pago,
    c.numero_factura_proveedor, c.ruta_factura, c.fecha_compra, c.fecha_registro, c.estado, c.observaciones,
    t.total_compra
  FROM compra c
  JOIN vw_totales_compra t ON t.id_compra = c.id_compra
  JOIN proveedor pr ON pr.id_proveedor = c.id_proveedor
  JOIN usuario u ON u.id_usuario = c.id_usuario
  JOIN metodo_pago mp ON mp.id_metodo_pago = c.id_metodo_pago`;

export const comprasRepo = {
  compras: (f: { q?: string; desde?: string; hasta?: string; estado?: string }) =>
    q(
      `${SELECT_COMPRA}
       WHERE (? IS NULL OR c.fecha_compra >= ?) AND (? IS NULL OR c.fecha_compra <= ?)
         AND (? IS NULL OR c.estado = ?)
         AND (? IS NULL OR CONCAT_WS(' ', c.id_compra, c.numero_factura_proveedor, pr.razon_social, pr.id_proveedor) LIKE ?)
       ORDER BY c.fecha_compra DESC, c.id_compra DESC`,
      [f.desde ?? null, f.desde ?? null, f.hasta ?? null, f.hasta ?? null, f.estado ?? null, f.estado ?? null,
        like(f.q), like(f.q)],
    ),

  async compra(id: string, conn?: Conn) {
    const compra = await q1(`${SELECT_COMPRA} WHERE c.id_compra = ?`, [id], conn);
    if (!compra) return undefined;
    const detalles = await q(
      `SELECT id_producto, producto, id_lote, fecha_vencimiento, cantidad, precio_unitario_compra, subtotal
       FROM vw_detalle_compra WHERE id_compra = ? ORDER BY producto, fecha_vencimiento`,
      [id],
      conn,
    );
    return { ...compra, detalles };
  },

  estadoParaEditar: (conn: Conn, id: string) =>
    q1<{ estado: string }>('SELECT estado FROM compra WHERE id_compra = ? FOR UPDATE', [id], conn),

  // Cuántos de los productos dados surte el proveedor y están activos.
  productosValidos: async (conn: Conn, idProveedor: string, productos: string[]) =>
    (await q(
      `SELECT pp.id_producto FROM producto_proveedor pp JOIN producto p ON p.id_producto = pp.id_producto
       WHERE pp.id_proveedor = ? AND p.estado AND pp.id_producto IN (?)`,
      [idProveedor, productos],
      conn,
    )).map((r) => r.id_producto as string),

  async crear(conn: PoolConnection, c: CabeceraCompra, idUsuario: string) {
    const id = await nextId(conn, 'compra', 'id_compra', 'CMP', 6);
    await exec(
      `INSERT INTO compra (id_compra, id_proveedor, id_usuario, id_metodo_pago, numero_factura_proveedor,
         fecha_compra, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, c.id_proveedor, idUsuario, c.id_metodo_pago, c.numero_factura_proveedor, c.fecha_compra, c.observaciones],
      conn,
    );
    return id;
  },

  actualizarCabecera: (conn: Conn, id: string, c: CabeceraCompra) =>
    exec(
      `UPDATE compra SET id_proveedor = ?, id_metodo_pago = ?, numero_factura_proveedor = ?, fecha_compra = ?,
         observaciones = ? WHERE id_compra = ?`,
      [c.id_proveedor, c.id_metodo_pago, c.numero_factura_proveedor, c.fecha_compra, c.observaciones, id],
      conn,
    ),

  // Triggers: solo con la compra PENDIENTE y vencimiento >= fecha_compra + 15 días.
  borrarDetalles: (conn: Conn, id: string) => exec('DELETE FROM detalle_compra WHERE id_compra = ?', [id], conn),

  // sp_agregar_detalle_compra busca el lote (producto + vencimiento) o lo crea
  // con el código que se le pasa (si el lote ya existía, ese código no se usa).
  async agregarDetalle(conn: PoolConnection, id: string, l: LineaCompra) {
    const loteNuevo = await nextId(conn, 'lote', 'id_lote', 'LOT', 6);
    await exec('CALL sp_agregar_detalle_compra(?, ?, ?, ?, ?, ?)', [
      id, l.id_producto, l.fecha_vencimiento, l.cantidad, l.precio_unitario_compra, loteNuevo,
    ], conn);
  },

  // PENDIENTE -> REGISTRADA: desde aquí su stock cuenta y queda inmutable.
  completar: (conn: Conn, id: string) => exec('CALL sp_completar_compra(?)', [id], conn),

  // trg_validar_anulacion_compra: solo se anula mientras está PENDIENTE.
  anular: (conn: Conn, id: string) =>
    exec("UPDATE compra SET estado = 'ANULADA' WHERE id_compra = ? AND estado = 'PENDIENTE'", [id], conn),

  guardarRutaFactura: (id: string, ruta: string) =>
    exec('UPDATE compra SET ruta_factura = ? WHERE id_compra = ?', [ruta, id]),
};
