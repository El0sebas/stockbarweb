// Datos semilla de Categorías — alineados 1:1 con el INSERT de categoria en
// scripts/sch.sql (mismos 4 nombres, mismo margen, mismo IVA, misma bandera
// de verificación de edad). Compartido entre CategoriasPage, ProductosPage
// (resuelve el IVA de cada producto), VentasPage (desglose del carrito y
// verificación de edad) y ComprasPage.
export const defaultCategorias = [
  { codigo: 'CAT-001', nombre: 'Licores', descripcion: 'Aguardientes, rones, tequilas y whiskys', margen_defecto_porcentaje: 35, porcentaje_iva: 5, requiere_verificacion_edad: true },
  { codigo: 'CAT-002', nombre: 'Cerveza', descripcion: 'Cervezas y presentaciones relacionadas', margen_defecto_porcentaje: 20, porcentaje_iva: 19, requiere_verificacion_edad: true },
  { codigo: 'CAT-003', nombre: 'Cigarrillos', descripcion: 'Productos de tabaco', margen_defecto_porcentaje: 12, porcentaje_iva: 19, requiere_verificacion_edad: true },
  { codigo: 'CAT-004', nombre: 'Snacks', descripcion: 'Dulces, confitería y productos secos', margen_defecto_porcentaje: 40, porcentaje_iva: 19, requiere_verificacion_edad: false },
];
