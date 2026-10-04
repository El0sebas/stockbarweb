// producto_proveedor — v5: catálogo puro de afiliación (qué proveedores
// PUEDEN surtir qué producto), sin atributos propios. No se deriva de las
// compras: un proveedor puede estar en el catálogo de un producto que
// todavía no se le ha comprado (ver Importaciones Andinas abajo).
export const defaultProductoProveedor = [
  { id_producto: 'PROD-01', nit_proveedor: '900123456-1' },
  { id_producto: 'PROD-02', nit_proveedor: '900123456-1' },
  { id_producto: 'PROD-03', nit_proveedor: '890900123-4' },
  { id_producto: 'PROD-04', nit_proveedor: '900654321-2' },
  { id_producto: 'PROD-05', nit_proveedor: '900654321-2' }
];
