// Subproceso 10 — Dashboard / Reportes (CU_11_01). Solo lectura sobre vistas.
// La exportación PDF/Excel (CU_11_02) la arma el cliente con estos datos.
import { Router } from 'express';
import { z } from 'zod';
import { requierePermiso } from '../middleware/auth.js';
import { dashboardRepo } from '../repositories/dashboard.repository.js';
import { fecha } from '../validate.js';

const r = Router();
const DIAS_POR_VENCER = 15; // misma señal que usa el frontend (utils/stock.js)

// Semáforo de stock: ALERTA al tocar el mínimo, BAJO cerca de tocarlo
// (hasta el doble del mínimo), igual que DashboardPage.
const semaforo = (actual: number, minimo: number) =>
  actual <= minimo ? 'ALERTA' : actual <= minimo * 2 ? 'BAJO' : 'OK';

r.get('/dashboard', requierePermiso('VER_REPORTES'), async (req, res) => {
  const f = z.object({ desde: fecha.optional(), hasta: fecha.optional() }).parse(req.query);
  const rango = { desde: f.desde ?? null, hasta: f.hasta ?? null };

  const [ventas, pendientes, porMetodo, top, porCategoria, compras, stock, porVencer] = await Promise.all([
    dashboardRepo.ventas(rango),
    dashboardRepo.ventasPendientes(),
    dashboardRepo.porMetodoPago(rango),
    dashboardRepo.topProductos(rango, 5),
    dashboardRepo.porCategoria(rango),
    dashboardRepo.comprasRegistradas(rango),
    dashboardRepo.stock(),
    dashboardRepo.lotesPorVencer(DIAS_POR_VENCER),
  ]);

  const totalVendido = Number(ventas.total);
  const stockPorProducto = stock.map((s) => ({ ...s, semaforo: semaforo(s.stock_actual, s.stock_minimo) }));
  res.json({
    rango,
    ventas: { ...ventas, pendientes },
    stock: {
      unidades: stock.reduce((t, s) => t + Number(s.stock_actual), 0),
      productos_en_alerta: stockPorProducto.filter((s) => s.semaforo === 'ALERTA').length,
    },
    mas_vendido: top[0] ?? null,
    categoria_lider: porCategoria[0]
      ? { ...porCategoria[0], participacion: totalVendido ? (Number(porCategoria[0].total) / totalVendido) * 100 : 0 }
      : null,
    ventas_por_metodo_pago: porMetodo,
    top_productos: top,
    ventas_por_categoria: porCategoria,
    compras,
    stock_por_producto: stockPorProducto,
    lotes_por_vencer: porVencer,
  });
});

export default r;
