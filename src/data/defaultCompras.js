// Datos semilla de Compras, compartidos entre ComprasPage y el Dashboard.
// v3: dos estados únicamente — REGISTRADA (el stock de sus lotes cuenta y es
// vendible de inmediato) -> ANULADA (terminal). Ya no existe el paso
// intermedio RECIBIDA. id_metodo_pago es la forma de pago única (HU_39), no
// un string libre.
export const defaultCompras = [
  {
    id_compra: 'CMP-000001',
    numero_factura_proveedor: 'FAC-1092',
    proveedor: 'Distribuidora de Licores de Antioquia',
    id_metodo_pago: 2,
    ruta_factura: 'fac-1092.pdf',
    fecha_compra: '2026-09-01',
    total: 3500000,
    estado: 'REGISTRADA'
  },
  {
    id_compra: 'CMP-000002',
    numero_factura_proveedor: 'FAC-8821',
    proveedor: 'Cervecería Nacional',
    id_metodo_pago: 3,
    ruta_factura: 'fac-8821.pdf',
    fecha_compra: '2026-09-05',
    total: 1200000,
    estado: 'REGISTRADA'
  }
];
