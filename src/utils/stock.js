// El stock de un producto nunca es un número guardado: siempre se calcula
// sumando lo disponible en sus lotes (mismo criterio que vw_stock_producto /
// vw_stock_lotes en la base de datos). Ver docs/DATABASE.md sección 3.
// getLotesProducto no filtra por estado_compra (igual que vw_stock_lotes,
// que muestra el lote sin importar si su compra sigue REGISTRADA) — se usa
// para listar. getStockDisponible / getLotesVendibles sí filtran (igual que
// vw_stock_producto, que solo suma estado_compra = 'REGISTRADA'): un lote de
// una compra ANULADA no cuenta como stock ni puede venderse o darse de baja.
export const getLotesProducto = (lotes, codigoProducto) =>
  (lotes || []).filter((lote) => lote.producto_codigo === codigoProducto);

export const getLotesVendibles = (lotes, codigoProducto) =>
  getLotesProducto(lotes, codigoProducto).filter((lote) => lote.estado_compra !== 'ANULADA');

export const getStockDisponible = (lotes, codigoProducto) =>
  getLotesVendibles(lotes, codigoProducto).reduce(
    (total, lote) => total + Number(lote.cantidad_disponible || 0),
    0
  );

// Un lote se sugiere como "por vencer" a 15 días o menos (misma regla que ya
// usaba VentasPage para el badge del carrito) — es solo una señal visual,
// nunca bloquea ni prioriza nada por sí sola.
export const DIAS_SUGERENCIA_VENCIMIENTO = 15;

// 'vencido' | 'por_vencer' | null — null cuando el lote no maneja
// vencimiento o todavía está lejos de vencer.
export const getEstadoVencimiento = (fechaVencimiento) => {
  if (!fechaVencimiento) return null;
  const dias = Math.ceil((new Date(fechaVencimiento) - new Date()) / 86400000);
  if (dias < 0) return 'vencido';
  if (dias <= DIAS_SUGERENCIA_VENCIMIENTO) return 'por_vencer';
  return null;
};
