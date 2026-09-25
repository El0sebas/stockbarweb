// Datos semilla de Categorías, compartidos entre CategoriasPage, ProductosPage
// (para resolver el IVA de cada producto) y VentasPage (desglose del carrito).
// porcentaje_iva es la única fuente de la tarifa de IVA que se cobra al
// cliente final: 19% general, 5% para licores (tarifa diferencial >15°).
export const defaultCategorias = [
  { codigo: 'CAT-01', nombre: 'Licores Importados', descripcion: 'Whisky, Tequila, Vodka importado', porcentaje_iva: 5 },
  { codigo: 'CAT-02', nombre: 'Licores Nacionales', descripcion: 'Aguardiente, Ron nacional', porcentaje_iva: 5 },
  { codigo: 'CAT-03', nombre: 'Cervezas', descripcion: 'Nacionales e importadas en botella o lata', porcentaje_iva: 19 },
];
