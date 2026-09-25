// El stock de un producto nunca es un número guardado: siempre se calcula
// sumando lo disponible en sus lotes (mismo criterio que vw_stock_producto /
// vw_stock_lotes en la base de datos). Ver docs/DATABASE.md sección 3.
export const getLotesProducto = (lotes, codigoProducto) =>
  (lotes || []).filter((lote) => lote.producto_codigo === codigoProducto);

export const getStockDisponible = (lotes, codigoProducto) =>
  getLotesProducto(lotes, codigoProducto).reduce(
    (total, lote) => total + Number(lote.cantidad_disponible || 0),
    0
  );
