// Catálogo semilla de productos, compartido entre ProductosPage (donde se
// administra), ComprasPage (buscador de productos al armar una compra),
// VentasPage y el Dashboard.
// Sin stockActual/porcentaje_impuesto/precio_incluye_impuesto: el stock
// siempre se calcula desde los lotes (ver utils/stock.js) y el IVA siempre
// viene de categoria.porcentaje_iva (ver data/defaultCategorias.js) — ningún
// producto guarda su propio número de stock ni su propia tasa de impuesto.
export const defaultProductos = [
  {
    codigo: 'PROD-01',
    nombre: 'Tequila Don Julio Reposado',
    descripcion: 'Tequila reposado premium de alta demanda para la carta y promociones.',
    categoria: 'Licores',
    precioVenta: 240000,
    maneja_vencimiento: true,
    stockMinimo: 3,
    estado: 'Activo'
  },
  {
    codigo: 'PROD-02',
    nombre: 'Aguardiente Antioqueño 750ml',
    descripcion: 'Aguardiente nacional con excelente rotación y excelente margen.',
    categoria: 'Licores',
    precioVenta: 65000,
    maneja_vencimiento: true,
    stockMinimo: 5,
    estado: 'Activo'
  },
  {
    codigo: 'PROD-03',
    nombre: 'Cerveza Club Colombia Dorada',
    descripcion: 'Cerveza lager de consumo frecuente, con manejo de lote y vencimiento.',
    categoria: 'Cerveza',
    precioVenta: 8000,
    maneja_vencimiento: true,
    stockMinimo: 10,
    estado: 'Activo'
  },
  {
    codigo: 'PROD-04',
    nombre: 'Cigarrillos Marlboro',
    descripcion: 'Cajetilla de 20 unidades.',
    categoria: 'Cigarrillos',
    precioVenta: 9500,
    maneja_vencimiento: false,
    stockMinimo: 10,
    estado: 'Activo'
  },
  {
    codigo: 'PROD-05',
    nombre: 'Papas Margarita',
    descripcion: 'Snack empacado, sin restricción de edad.',
    categoria: 'Snacks',
    precioVenta: 4500,
    maneja_vencimiento: true,
    stockMinimo: 15,
    estado: 'Activo'
  }
];
