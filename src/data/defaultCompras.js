// Datos semilla de Compras, compartidos entre ComprasPage y el Dashboard.
export const defaultCompras = [
  {
    id: 1,
    factura: 'FAC-1092',
    proveedor: 'Fábrica de Licores de Antioquia',
    metodoPago: 'Nequi',
    rutaFactura: '/docs/facturas/fac-1092.pdf',
    fecha: '2026-09-01',
    total: 3500000,
    estado: 'Recibida'
  },
  {
    id: 2,
    factura: 'FAC-8821',
    proveedor: 'Bavaria S.A.',
    metodoPago: 'Tarjeta',
    rutaFactura: '/docs/facturas/fac-8821.pdf',
    fecha: '2026-09-05',
    total: 1200000,
    estado: 'Pendiente'
  }
];
