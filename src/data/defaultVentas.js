// Datos semilla de Ventas, compartidos entre VentasPage y el Dashboard.
// porcentajeIva queda congelada por línea (igual que
// detalle_venta.porcentaje_impuesto_aplicado en la base de datos): refleja
// la tarifa de la categoría del producto en el momento de la venta.
export const defaultVentas = [
  {
    idVenta: 'VNT-001',
    cliente: 'Alejandro Giraldo',
    fecha: '2026-09-07 10:30',
    productos: [
      { nombre: 'Tequila Don Julio Reposado', cantidad: 1, precio: 240000, lote: 'LT-001', porcentajeIva: 5 },
      { nombre: 'Cerveza Club Colombia Dorada', cantidad: 4, precio: 8000, lote: 'CR-110', porcentajeIva: 19 }
    ],
    total: 272000,
    estado: 'Completado'
  },
  {
    idVenta: 'VNT-002',
    cliente: 'Valeria Restrepo',
    fecha: '2026-09-07 11:15',
    productos: [
      { nombre: 'Aguardiente Antioqueño 750ml', cantidad: 2, precio: 65000, lote: 'AG-208', porcentajeIva: 5 }
    ],
    total: 130000,
    estado: 'Pendiente'
  }
];

// Catálogo interno de Ventas (con seguimiento de lote/vencimiento para POS).
// Es independiente del catálogo de Productos porque ese aún no modela lotes.
// `categoria` referencia data/defaultCategorias.js: es la única fuente del
// % de IVA que se congela por línea al vender (ver utils/impuestos.js).
export const defaultCatalogoVentas = [
  {
    id: 'PROD-01',
    nombre: 'Tequila Don Julio Reposado',
    categoria: 'Licores Importados',
    precio: 240000,
    maneja_vencimiento: true,
    lotes: [
      { id_lote: 1, numero_lote: 'LT-001', fecha_vencimiento: '2026-09-12', cantidad_disponible: 3 },
      { id_lote: 2, numero_lote: 'LT-002', fecha_vencimiento: '2026-10-01', cantidad_disponible: 6 }
    ]
  },
  {
    id: 'PROD-02',
    nombre: 'Aguardiente Antioqueño 750ml',
    categoria: 'Licores Nacionales',
    precio: 65000,
    maneja_vencimiento: true,
    lotes: [
      { id_lote: 3, numero_lote: 'AG-208', fecha_vencimiento: '2026-11-11', cantidad_disponible: 5 },
      { id_lote: 4, numero_lote: 'AG-210', fecha_vencimiento: '2026-12-10', cantidad_disponible: 8 }
    ]
  },
  {
    id: 'PROD-03',
    nombre: 'Cerveza Club Colombia Dorada',
    categoria: 'Cervezas',
    precio: 8000,
    maneja_vencimiento: true,
    lotes: [
      { id_lote: 5, numero_lote: 'CR-110', fecha_vencimiento: '2026-09-15', cantidad_disponible: 12 },
      { id_lote: 6, numero_lote: 'CR-115', fecha_vencimiento: '2026-09-30', cantidad_disponible: 18 }
    ]
  },
  {
    id: 'PROD-04',
    nombre: 'Whisky Old Parr 12 Años',
    categoria: 'Licores Importados',
    precio: 190000,
    maneja_vencimiento: false,
    lotes: []
  }
];
