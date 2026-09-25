// Datos semilla de Categorías — alineados 1:1 con el INSERT de categoria en
// scripts/sch.sql (mismos 4 nombres, mismo margen, mismo IVA, misma bandera
// de verificación de edad). Compartido entre CategoriasPage, ProductosPage
// (resuelve el IVA de cada producto), VentasPage (desglose del carrito y
// verificación de edad) y ComprasPage.
export const defaultCategorias = [
  { codigo: 'CAT-01', nombre: 'Licores', descripcion: 'Aguardientes, rones, tequilas y whiskys', porcentaje_iva: 5, requiere_verificacion_edad: true },
  { codigo: 'CAT-02', nombre: 'Cerveza', descripcion: 'Cervezas y presentaciones relacionadas', porcentaje_iva: 19, requiere_verificacion_edad: true },
  { codigo: 'CAT-03', nombre: 'Cigarrillos', descripcion: 'Productos de tabaco', porcentaje_iva: 19, requiere_verificacion_edad: true },
  { codigo: 'CAT-04', nombre: 'Snacks', descripcion: 'Dulces, confitería y productos secos', porcentaje_iva: 19, requiere_verificacion_edad: false },
];
