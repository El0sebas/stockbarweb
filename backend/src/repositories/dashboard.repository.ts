// Dashboard / Reportes: solo lectura y solo sobre vistas (CLAUDE.md regla 10).
import { q, q1 } from '../db.js';

export interface Rango {
  desde: string | null;
  hasta: string | null;
}

const enRango = (columna: string) => `(? IS NULL OR DATE(${columna}) >= ?) AND (? IS NULL OR DATE(${columna}) <= ?)`;
const p = (r: Rango) => [r.desde, r.desde, r.hasta, r.hasta];

// Ventas COMPLETADAS del rango con su total y base gravable, agrupadas sobre
// vw_detalle_venta y redondeadas por venta (igual que vw_totales_venta), pero
// de una sola pasada: las funciones venta por venta tardaban ~6 s con un año.
const VENTAS_DEL_RANGO = `(
  SELECT d.id_venta, v.id_metodo_pago,
    ROUND(SUM(d.subtotal), 2) AS total_venta,
    ROUND(SUM(d.subtotal / (1 + d.porcentaje_impuesto_aplicado / 100)), 2) AS base_gravable
  FROM vw_detalle_venta d JOIN venta v ON v.id_venta = d.id_venta
  WHERE d.estado = 'COMPLETADA' AND ${enRango('d.fecha_hora_venta')}
  GROUP BY d.id_venta, v.id_metodo_pago) tv`;

export const dashboardRepo = {
  ventas: (r: Rango) =>
    q1(
      `SELECT COUNT(*) AS ventas_completadas, COALESCE(SUM(tv.total_venta), 0) AS total,
         COALESCE(SUM(tv.base_gravable), 0) AS base_gravable,
         COALESCE(SUM(tv.total_venta - tv.base_gravable), 0) AS iva
       FROM ${VENTAS_DEL_RANGO}`,
      p(r),
    ),

  ventasPendientes: async () =>
    Number((await q1("SELECT COUNT(*) AS n FROM venta WHERE estado = 'PENDIENTE'")).n),

  porMetodoPago: (r: Rango) =>
    q(
      `SELECT tv.id_metodo_pago, mp.nombre AS metodo_pago, COUNT(*) AS ventas, SUM(tv.total_venta) AS total
       FROM ${VENTAS_DEL_RANGO} JOIN metodo_pago mp ON mp.id_metodo_pago = tv.id_metodo_pago
       GROUP BY tv.id_metodo_pago, mp.nombre ORDER BY total DESC`,
      p(r),
    ),

  topProductos: (r: Rango, limite: number) =>
    q(
      `SELECT id_producto, producto, SUM(cantidad) AS unidades, SUM(subtotal) AS total
       FROM vw_detalle_venta WHERE estado = 'COMPLETADA' AND ${enRango('fecha_hora_venta')}
       GROUP BY id_producto, producto ORDER BY unidades DESC, total DESC LIMIT ?`,
      [...p(r), limite],
    ),

  porCategoria: (r: Rango) =>
    q(
      `SELECT id_categoria, categoria, SUM(cantidad) AS unidades, SUM(subtotal) AS total
       FROM vw_detalle_venta WHERE estado = 'COMPLETADA' AND ${enRango('fecha_hora_venta')}
       GROUP BY id_categoria, categoria ORDER BY total DESC`,
      p(r),
    ),

  comprasRegistradas: (r: Rango) =>
    q1(
      `SELECT COUNT(*) AS compras, COALESCE(SUM(total_compra), 0) AS total
       FROM vw_totales_compra WHERE estado = 'REGISTRADA' AND ${enRango('fecha_compra')}`,
      p(r),
    ),

  // Stock actual por producto activo (única fuente: vw_stock_producto).
  stock: () =>
    q(
      `SELECT s.id_producto, s.nombre, s.stock_minimo, s.stock_actual, (s.bajo_stock = 1) AS bajo_stock
       FROM vw_stock_producto s JOIN producto pr ON pr.id_producto = s.id_producto
       WHERE pr.estado ORDER BY s.bajo_stock DESC, s.nombre`,
    ),

  // Lotes con stock que vencen en los próximos N días (o ya vencidos).
  lotesPorVencer: (dias: number) =>
    q(
      `SELECT id_lote, id_producto, producto, fecha_vencimiento, cantidad_disponible,
         DATEDIFF(fecha_vencimiento, CURDATE()) AS dias_restantes
       FROM vw_stock_lotes
       WHERE cantidad_disponible > 0 AND fecha_vencimiento IS NOT NULL
         AND fecha_vencimiento <= CURDATE() + INTERVAL ? DAY
       ORDER BY fecha_vencimiento`,
      [dias],
    ),
};
