// Lotes semilla — v3: un lote ES (producto, fecha_vencimiento), ya NO
// pertenece a una sola compra ni guarda precio/numero_lote_proveedor (esos
// datos viven en detalle_compra, ver defaultDetalleCompra.js). cantidad_disponible
// es un total corriente (equivalente cacheado de fn_stock_lote) que se
// actualiza en cada compra/venta/baja — nunca editable directamente.
export const defaultLotes = [
  {
    id_lote: 'LOT-000001',
    id_producto: 'PROD-02',
    fecha_vencimiento: '2026-12-01',
    cantidad_disponible: 24
  },
  {
    id_lote: 'LOT-000002',
    id_producto: 'PROD-03',
    fecha_vencimiento: '2026-10-15',
    cantidad_disponible: 2
  },
  {
    id_lote: 'LOT-000003',
    id_producto: 'PROD-01',
    fecha_vencimiento: '2027-03-01',
    cantidad_disponible: 12
  }
];
