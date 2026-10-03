// detalle_compra — v3: la relación real compra↔lote (N:N). Una fila por cada
// entrada que una compra hizo a un lote: cuánto trajo y a qué precio. El
// precio de compra vive aquí UNA sola vez (nunca en lote). PK compuesta
// conceptual (id_compra, id_lote); en el mock no hace falta enforzarla
// aparte porque ComprasPage ya evita duplicar la pareja al sincronizar.
export const defaultDetalleCompra = [
  { id_compra: 'CMP-000001', id_lote: 'LOT-000001', cantidad: 24, precio_unitario_compra: 45000 },
  { id_compra: 'CMP-000002', id_lote: 'LOT-000002', cantidad: 30, precio_unitario_compra: 5500 },
  { id_compra: 'CMP-000001', id_lote: 'LOT-000003', cantidad: 12, precio_unitario_compra: 180000 }
];
