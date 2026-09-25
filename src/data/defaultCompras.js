// Datos semilla de Compras, compartidos entre ComprasPage y el Dashboard.
// Los campos siguen los nombres de columna reales de scripts/sch.sql
// (numero_factura_proveedor, ruta_factura, fecha_compra).
export const defaultCompras = [
  {
    id: 1,
    numero_factura_proveedor: 'FAC-1092',
    proveedor: 'Distribuidora de Licores de Antioquia',
    metodoPago: 'Nequi',
    ruta_factura: 'fac-1092.pdf',
    fecha_compra: '2026-09-01',
    total: 3500000,
    estado: 'Recibida'
  },
  {
    id: 2,
    numero_factura_proveedor: 'FAC-8821',
    proveedor: 'Cervecería Nacional',
    metodoPago: 'Bancolombia',
    ruta_factura: 'fac-8821.pdf',
    fecha_compra: '2026-09-05',
    total: 1200000,
    estado: 'Pendiente'
  }
];
