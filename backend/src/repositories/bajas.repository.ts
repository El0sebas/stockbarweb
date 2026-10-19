import type { PoolConnection } from 'mysql2/promise';
import { exec, like, nextId, q, q1, type Conn } from '../db.js';

export interface DatosBaja {
  id_motivo_baja: string;
  cantidad: number;
  observaciones: string | null;
}

const SELECT_BAJA = `
  SELECT b.id_baja, b.id_lote, l.id_producto, p.nombre AS producto, c.nombre AS categoria, l.fecha_vencimiento,
    b.id_motivo_baja, m.nombre AS motivo, b.cantidad, b.fecha_hora, b.id_usuario,
    CONCAT_WS(' ', u.nombres, u.apellidos) AS usuario, b.observaciones
  FROM baja_inventario b
  JOIN lote l ON l.id_lote = b.id_lote
  JOIN producto p ON p.id_producto = l.id_producto
  JOIN categoria c ON c.id_categoria = p.id_categoria
  JOIN motivo_baja m ON m.id_motivo_baja = b.id_motivo_baja
  JOIN usuario u ON u.id_usuario = b.id_usuario`;

export const bajasRepo = {
  bajas: (f: { q?: string; desde?: string; hasta?: string }) =>
    q(
      `${SELECT_BAJA}
       WHERE (? IS NULL OR DATE(b.fecha_hora) >= ?) AND (? IS NULL OR DATE(b.fecha_hora) <= ?)
         AND (? IS NULL OR CONCAT_WS(' ', p.id_producto, p.nombre, b.id_lote, m.nombre, u.nombres, u.apellidos) LIKE ?)
       ORDER BY b.fecha_hora DESC, b.id_baja DESC`,
      [f.desde ?? null, f.desde ?? null, f.hasta ?? null, f.hasta ?? null, like(f.q), like(f.q)],
    ),

  baja: (id: string) => q1(`${SELECT_BAJA} WHERE b.id_baja = ?`, [id]),

  // Lotes con stock para el selector "Lote a dar de baja" (vw_stock_lotes).
  lotesConStock: (texto?: string) =>
    q(
      `SELECT id_lote, id_producto, producto, fecha_vencimiento, cantidad_disponible FROM vw_stock_lotes
       WHERE cantidad_disponible > 0 AND (? IS NULL OR CONCAT_WS(' ', id_lote, id_producto, producto) LIKE ?)
       ORDER BY producto, fecha_vencimiento IS NULL, fecha_vencimiento LIMIT 50`,
      [like(texto), like(texto)],
    ),

  // Bloquea el lote como lo hacen las ventas: una baja y una venta del mismo
  // lote no validan el stock a la vez.
  bloquearLote: (conn: Conn, idLote: string) =>
    q('SELECT id_lote FROM lote WHERE id_lote = ? FOR UPDATE', [idLote], conn),

  // trg_validar_baja_ins rechaza una baja mayor al disponible del lote.
  async crear(conn: PoolConnection, idLote: string, b: DatosBaja, idUsuario: string) {
    await bajasRepo.bloquearLote(conn, idLote);
    const id = await nextId(conn, 'baja_inventario', 'id_baja', 'BAJ', 6);
    await exec(
      `INSERT INTO baja_inventario (id_baja, id_lote, id_motivo_baja, cantidad, id_usuario, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, idLote, b.id_motivo_baja, b.cantidad, idUsuario, b.observaciones],
      conn,
    );
    return id;
  },

  // trg_validar_baja_upd revalida contra el disponible + lo ya descontado.
  async actualizar(conn: Conn, id: string, b: DatosBaja) {
    const baja = await q1<{ id_lote: string }>('SELECT id_lote FROM baja_inventario WHERE id_baja = ?', [id], conn);
    if (!baja) return null;
    await bajasRepo.bloquearLote(conn, baja.id_lote);
    return exec('UPDATE baja_inventario SET id_motivo_baja = ?, cantidad = ?, observaciones = ? WHERE id_baja = ?', [
      b.id_motivo_baja, b.cantidad, b.observaciones, id,
    ], conn);
  },

  // HU_50: baja automática de lotes vencidos (sp con GET_LOCK para numerar).
  darBajaVencidos: (idUsuario: string) => exec('CALL sp_dar_baja_lotes_vencidos(?)', [idUsuario]),
};
