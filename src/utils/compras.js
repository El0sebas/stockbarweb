// Espejo de trg_validar_anulacion_compra: una compra solo puede anularse si
// ninguno de sus lotes tiene ventas (PENDIENTE/COMPLETADA) o bajas encima.
export const tieneMovimientos = (compra, lotes, ventas, bajas) => {
  const idsLote = lotes.filter((l) => l.id_compra === compra.id).map((l) => l.id_lote);
  const enVenta = ventas.some(
    (v) => ['PENDIENTE', 'COMPLETADA'].includes(v.estado) && v.productos.some((p) => idsLote.includes(p.id_lote))
  );
  const enBaja = bajas.some((b) => idsLote.includes(b.id_lote));
  return enVenta || enBaja;
};
