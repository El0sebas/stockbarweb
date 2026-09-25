// Espejo de vw_totales_venta: precio_unitario_venta ya incluye el IVA (igual
// que en el mostrador real), así que la base gravable se obtiene
// descontando la tasa congelada por línea, nunca sumando el IVA aparte.
// items: [{ precio, cantidad, porcentajeIva }]
export const calcularTotalesVenta = (items) =>
  (items || []).reduce(
    (acc, item) => {
      const totalLinea = Number(item.precio) * Number(item.cantidad);
      const tasa = Number(item.porcentajeIva || 0);
      const baseLinea = totalLinea / (1 + tasa / 100);
      return {
        baseGravable: acc.baseGravable + baseLinea,
        iva: acc.iva + (totalLinea - baseLinea),
        total: acc.total + totalLinea
      };
    },
    { baseGravable: 0, iva: 0, total: 0 }
  );

export const getPorcentajeIva = (categorias, nombreCategoria) =>
  Number((categorias || []).find((c) => c.nombre === nombreCategoria)?.porcentaje_iva ?? 0);
