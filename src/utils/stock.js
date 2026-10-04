// El stock de un producto nunca es un número guardado: siempre se calcula
// sumando lo disponible en sus lotes (mismo criterio que vw_stock_producto /
// vw_stock_lotes en la base de datos). Ver docs/DATABASE.md sección 3.
// v6: un lote ya no carga estado_compra — cantidad_disponible solo sube al
// completar una compra PENDIENTE (ComprasPage.completarCompra), así que todo
// lote con cantidad visible aquí ya es, por construcción, vendible.
export const getLotesProducto = (lotes, idProducto) =>
  (lotes || []).filter((lote) => lote.id_producto === idProducto);

// v3: ya no hay estado_compra que filtrar aquí — queda como alias para no
// romper a quienes ya la llaman (VentasPage filtra cantidad_disponible > 0
// explícitamente al armar el FEFO).
export const getLotesVendibles = getLotesProducto;

export const getStockDisponible = (lotes, idProducto) =>
  getLotesProducto(lotes, idProducto).reduce(
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
