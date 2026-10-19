import type { PoolConnection } from 'mysql2/promise';
import { exec, like, nextId, q, q1, type Conn } from '../db.js';

export interface DatosProducto {
  nombre: string;
  descripcion: string | null;
  id_categoria: string;
  id_unidad_medida: string;
  margen_personalizado_porcentaje: number | null;
  precio_venta_actual: number;
  maneja_vencimiento: boolean;
  stock_minimo: number;
}

// El stock actual SIEMPRE sale de vw_stock_producto (nunca de una columna).
const SELECT_PRODUCTO = `
  SELECT p.id_producto, p.nombre, p.descripcion, p.id_categoria, c.nombre AS categoria, c.porcentaje_iva,
    c.requiere_verificacion_edad, p.id_unidad_medida, um.nombre AS unidad_medida,
    p.margen_personalizado_porcentaje, c.margen_defecto_porcentaje, p.precio_venta_actual,
    p.maneja_vencimiento, p.stock_minimo, s.stock_actual, (s.bajo_stock = 1) AS bajo_stock,
    p.estado, p.fecha_creacion
  FROM producto p
  JOIN categoria c ON c.id_categoria = p.id_categoria
  JOIN unidad_medida um ON um.id_unidad_medida = p.id_unidad_medida
  JOIN vw_stock_producto s ON s.id_producto = p.id_producto`;

async function asignarProveedores(conn: Conn, idProducto: string, proveedores: string[]) {
  await exec('DELETE FROM producto_proveedor WHERE id_producto = ?', [idProducto], conn);
  await exec('INSERT INTO producto_proveedor (id_producto, id_proveedor) VALUES ?', [
    proveedores.map((p) => [idProducto, p]),
  ], conn);
}

export const productosRepo = {
  productos: (f: { q?: string; id_categoria?: string; estado?: boolean; bajo_stock?: boolean }) =>
    q(
      `${SELECT_PRODUCTO}
       WHERE (? IS NULL OR p.id_categoria = ?)
         AND (? IS NULL OR p.estado = ?)
         AND (? IS NULL OR s.bajo_stock = ?)
         AND (? IS NULL OR CONCAT_WS(' ', p.id_producto, p.nombre, c.nombre) LIKE ?)
       ORDER BY p.nombre`,
      [f.id_categoria ?? null, f.id_categoria ?? null, f.estado ?? null, f.estado ?? null,
        f.bajo_stock ?? null, f.bajo_stock ?? null, like(f.q), like(f.q)],
    ),

  // Detalle: proveedores (vw_productos_por_proveedor) y lotes de solo lectura
  // (vw_stock_lotes, solo los que ya recibieron entradas de compras REGISTRADAS).
  async producto(id: string) {
    const producto = await q1(`${SELECT_PRODUCTO} WHERE p.id_producto = ?`, [id]);
    if (!producto) return undefined;
    const [proveedores, lotes, ultimaCompra] = await Promise.all([
      q(`SELECT id_proveedor, proveedor, proveedor_activo FROM vw_productos_por_proveedor
         WHERE id_producto = ? ORDER BY proveedor`, [id]),
      q(`SELECT id_lote, fecha_vencimiento, cantidad_ingresada, cantidad_disponible FROM vw_stock_lotes
         WHERE id_producto = ? AND cantidad_ingresada > 0
         ORDER BY fecha_vencimiento IS NULL, fecha_vencimiento, id_lote`, [id]),
      // Costo de la última compra REGISTRADA: base del precio sugerido.
      q1(`SELECT d.precio_unitario_compra FROM vw_detalle_compra d JOIN compra c ON c.id_compra = d.id_compra
         WHERE d.id_producto = ? AND c.estado = 'REGISTRADA'
         ORDER BY c.fecha_compra DESC, c.fecha_registro DESC LIMIT 1`, [id]),
    ]);
    return { ...producto, proveedores, lotes, costo_referencia: ultimaCompra?.precio_unitario_compra ?? null };
  },

  siguienteId: (conn: PoolConnection) => nextId(conn, 'producto', 'id_producto', 'PROD', 2),

  async crear(conn: Conn, id: string, p: DatosProducto, proveedores: string[]) {
    await exec(
      `INSERT INTO producto (id_producto, nombre, descripcion, id_categoria, id_unidad_medida,
         margen_personalizado_porcentaje, precio_venta_actual, maneja_vencimiento, stock_minimo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, p.nombre, p.descripcion, p.id_categoria, p.id_unidad_medida, p.margen_personalizado_porcentaje,
        p.precio_venta_actual, p.maneja_vencimiento, p.stock_minimo],
      conn,
    );
    await asignarProveedores(conn, id, proveedores);
  },

  // Desmarcar un proveedor elimina la fila del catálogo; las compras ya
  // registradas no dependen de producto_proveedor (sch.sql nota 3).
  async actualizar(conn: Conn, id: string, p: DatosProducto, proveedores: string[]) {
    const r = await exec(
      `UPDATE producto SET nombre = ?, descripcion = ?, id_categoria = ?, id_unidad_medida = ?,
         margen_personalizado_porcentaje = ?, precio_venta_actual = ?, maneja_vencimiento = ?, stock_minimo = ?
       WHERE id_producto = ?`,
      [p.nombre, p.descripcion, p.id_categoria, p.id_unidad_medida, p.margen_personalizado_porcentaje,
        p.precio_venta_actual, p.maneja_vencimiento, p.stock_minimo, id],
      conn,
    );
    if (r.affectedRows) await asignarProveedores(conn, id, proveedores);
    return r;
  },

  cambiarEstado: (id: string, estado: boolean) =>
    exec('UPDATE producto SET estado = ? WHERE id_producto = ?', [estado, id]),

  // Si el producto ya tiene lotes (compras/ventas/bajas) la FK lo impide y la
  // transacción revierte también el borrado de producto_proveedor.
  async eliminar(conn: Conn, id: string) {
    await exec('DELETE FROM producto_proveedor WHERE id_producto = ?', [id], conn);
    return exec('DELETE FROM producto WHERE id_producto = ?', [id], conn);
  },
};
