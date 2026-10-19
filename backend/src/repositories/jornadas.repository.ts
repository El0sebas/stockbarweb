import type { PoolConnection } from 'mysql2/promise';
import { exec, like, nextId, q, q1, type Conn } from '../db.js';

// Historial con totales por vw_totales_jornada (Ficha: Subproceso de Jornada).
const SELECT_JORNADA = `
  SELECT t.id_jornada, t.estado, t.fecha_hora_apertura, t.id_usuario_apertura,
    CONCAT_WS(' ', ua.nombres, ua.apellidos) AS usuario_apertura, t.fecha_hora_cierre, t.id_usuario_cierre,
    CONCAT_WS(' ', uc.nombres, uc.apellidos) AS usuario_cierre, j.observaciones,
    t.ventas_completadas, t.total_ventas
  FROM vw_totales_jornada t
  JOIN jornada j ON j.id_jornada = t.id_jornada
  JOIN usuario ua ON ua.id_usuario = t.id_usuario_apertura
  LEFT JOIN usuario uc ON uc.id_usuario = t.id_usuario_cierre`;

export const jornadasRepo = {
  jornadas: (f: { q?: string; desde?: string; hasta?: string }) =>
    q(
      `${SELECT_JORNADA}
       WHERE (? IS NULL OR DATE(t.fecha_hora_apertura) >= ?) AND (? IS NULL OR DATE(t.fecha_hora_apertura) <= ?)
         AND (? IS NULL OR CONCAT_WS(' ', ua.nombres, ua.apellidos, uc.nombres, uc.apellidos) LIKE ?)
       ORDER BY t.fecha_hora_apertura DESC`,
      [f.desde ?? null, f.desde ?? null, f.hasta ?? null, f.hasta ?? null, like(f.q), like(f.q)],
    ),

  abierta: (conn?: Conn) => q1(`${SELECT_JORNADA} WHERE t.estado = 'ABIERTA'`, [], conn),

  // Registrar una venta toma la jornada en modo compartido y cerrarla en
  // exclusivo: así no se cierra una jornada mientras entra una venta.
  bloquearAbierta: (conn: Conn, exclusivo: boolean) =>
    q1<{ id_jornada: string }>(
      `SELECT id_jornada FROM jornada WHERE estado = 'ABIERTA' ${exclusivo ? 'FOR UPDATE' : 'FOR SHARE'}`,
      [],
      conn,
    ),

  // Desglose de ventas COMPLETADAS de la jornada: totales y por método de pago.
  async jornada(id: string) {
    const jornada = await q1(`${SELECT_JORNADA} WHERE t.id_jornada = ?`, [id]);
    if (!jornada) return undefined;
    const [resumen, porMetodo] = await Promise.all([
      q1(
        `SELECT COUNT(*) AS ventas_completadas, COALESCE(SUM(tv.total_venta), 0) AS total_vendido,
           COALESCE(SUM(tv.base_gravable), 0) AS base_gravable, COALESCE(SUM(tv.iva), 0) AS iva
         FROM vw_totales_venta tv JOIN venta v ON v.id_venta = tv.id_venta
         WHERE v.id_jornada = ? AND tv.estado = 'COMPLETADA'`,
        [id],
      ),
      q(
        `SELECT tv.id_metodo_pago, mp.nombre AS metodo_pago, COUNT(*) AS ventas, SUM(tv.total_venta) AS total
         FROM vw_totales_venta tv JOIN venta v ON v.id_venta = tv.id_venta
         JOIN metodo_pago mp ON mp.id_metodo_pago = tv.id_metodo_pago
         WHERE v.id_jornada = ? AND tv.estado = 'COMPLETADA'
         GROUP BY tv.id_metodo_pago, mp.nombre HAVING total > 0 ORDER BY total DESC`,
        [id],
      ),
    ]);
    return { ...jornada, resumen: { ...resumen, por_metodo_pago: porMetodo } };
  },

  // uq_una_jornada_abierta garantiza una sola ABIERTA en todo el sistema.
  async abrir(conn: PoolConnection, idUsuario: string, observaciones: string | null) {
    const id = await nextId(conn, 'jornada', 'id_jornada', 'JOR', 6);
    await exec('INSERT INTO jornada (id_jornada, id_usuario_apertura, observaciones) VALUES (?, ?, ?)', [
      id, idUsuario, observaciones,
    ], conn);
    return id;
  },

  ventasPendientes: async (conn: Conn, id: string) =>
    Number((await q1("SELECT COUNT(*) AS n FROM venta WHERE id_jornada = ? AND estado = 'PENDIENTE'", [id], conn)).n),

  cerrar: (conn: Conn, id: string, idUsuario: string, observaciones: string | null) =>
    exec(
      `UPDATE jornada SET estado = 'CERRADA', fecha_hora_cierre = NOW(), id_usuario_cierre = ?,
         observaciones = COALESCE(?, observaciones) WHERE id_jornada = ? AND estado = 'ABIERTA'`,
      [idUsuario, observaciones, id],
      conn,
    ),
};
