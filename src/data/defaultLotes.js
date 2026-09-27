// Lotes semilla, compartidos entre ComprasPage (los crea, una fila por línea
// de compra), ProductosPage (calcula el stock leyendo estos lotes, nunca un
// número editable) y VentasPage (descuenta cantidad_disponible al vender).
// Todo lote nace de una compra: id_compra nunca es null (ver stockbar_schema_mysql.sql).
// estado_compra denormaliza compra.estado (igual que vw_stock_lotes): un
// lote solo cuenta como stock/puede venderse o darse de baja cuando su
// compra está RECIBIDA — uno de una compra PENDIENTE o ANULADA no cuenta
// — ver utils/stock.js.
export const defaultLotes = [
  {
    id_lote: 1,
    id_compra: 1,
    producto_codigo: 'PROD-02',
    cantidad: 24,
    cantidad_disponible: 24,
    precio_unitario_compra: 45000,
    fecha_vencimiento: '2026-12-01',
    numero_lote_proveedor: 'AG-208',
    estado_compra: 'RECIBIDA'
  },
  {
    id_lote: 2,
    id_compra: 2,
    producto_codigo: 'PROD-03',
    cantidad: 30,
    cantidad_disponible: 2,
    precio_unitario_compra: 5500,
    fecha_vencimiento: '2026-10-15',
    numero_lote_proveedor: 'CR-110',
    estado_compra: 'RECIBIDA'
  },
  {
    id_lote: 3,
    id_compra: 1,
    producto_codigo: 'PROD-01',
    cantidad: 12,
    cantidad_disponible: 12,
    precio_unitario_compra: 180000,
    fecha_vencimiento: '2027-03-01',
    numero_lote_proveedor: 'TQ-045',
    estado_compra: 'RECIBIDA'
  }
];
