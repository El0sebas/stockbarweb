// Lotes semilla, compartidos entre ComprasPage (los crea, una fila por línea
// de compra), ProductosPage (calcula el stock leyendo estos lotes, nunca un
// número editable) y VentasPage (descuenta cantidad_disponible al vender).
// Todo lote nace de una compra: id_compra nunca es null (ver stockbar_schema_mysql.sql).
export const defaultLotes = [
  {
    id_lote: 1,
    id_compra: 1,
    producto_codigo: 'PROD-02',
    cantidad: 24,
    cantidad_disponible: 24,
    precio_unitario_compra: 45000,
    fecha_vencimiento: '2026-12-01',
    numero_lote_proveedor: 'AG-208'
  },
  {
    id_lote: 2,
    id_compra: 2,
    producto_codigo: 'PROD-03',
    cantidad: 30,
    cantidad_disponible: 2,
    precio_unitario_compra: 5500,
    fecha_vencimiento: '2026-10-15',
    numero_lote_proveedor: 'CR-110'
  },
  {
    id_lote: 3,
    id_compra: 1,
    producto_codigo: 'PROD-01',
    cantidad: 12,
    cantidad_disponible: 12,
    precio_unitario_compra: 180000,
    fecha_vencimiento: '2027-03-01',
    numero_lote_proveedor: 'TQ-045'
  }
];
