// Catálogo semilla de productos, compartido entre ProductosPage (donde se
// administra) y el Dashboard (que calcula KPIs/alertas reales sobre estos datos).
export const defaultProductos = [
  {
    codigo: 'PROD-01',
    nombre: 'Tequila Don Julio Reposado',
    descripcion: 'Tequila reposado premium de alta demanda para la carta y promociones.',
    categoria: 'Licores Importados',
    precioVenta: 240000,
    porcentaje_impuesto: 19,
    precio_incluye_impuesto: true,
    maneja_vencimiento: true,
    stockActual: 12,
    stockMinimo: 3,
    estado: 'Activo'
  },
  {
    codigo: 'PROD-02',
    nombre: 'Aguardiente Antioqueño 750ml',
    descripcion: 'Aguardiente nacional con excelente rotación y excelente margen.',
    categoria: 'Licores Nacionales',
    precioVenta: 65000,
    porcentaje_impuesto: 19,
    precio_incluye_impuesto: false,
    maneja_vencimiento: true,
    stockActual: 24,
    stockMinimo: 5,
    estado: 'Activo'
  },
  {
    codigo: 'PROD-03',
    nombre: 'Cerveza Club Colombia Dorada',
    descripcion: 'Cerveza lager de consumo frecuente, con manejo de lote y vencimiento.',
    categoria: 'Cervezas',
    precioVenta: 8000,
    porcentaje_impuesto: 19,
    precio_incluye_impuesto: false,
    maneja_vencimiento: true,
    stockActual: 2,
    stockMinimo: 10,
    estado: 'Activo'
  }
];
