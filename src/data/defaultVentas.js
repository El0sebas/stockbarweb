// Datos semilla de Ventas. Anteriores a que existiera Jornada en el
// prototipo, así que id_jornada queda en null (no coinciden con ninguna
// jornada real y por lo tanto no aparecen en ningún resumen de cierre —
// es el comportamiento correcto para datos históricos previos al módulo).
// v3: id_metodo_pago es único por venta (ya no hay venta_pago/pago
// dividido); porcentajeIva queda congelada por línea igual que
// detalle_venta.porcentaje_impuesto_aplicado.
export const defaultVentas = [
  {
    id_venta: 'VTA-000001',
    id_cliente: null,
    cliente: 'Alejandro Giraldo',
    id_jornada: null,
    id_usuario: null,
    usuario: 'N/A',
    id_metodo_pago: 1,
    fecha_hora_venta: '2026-09-07T10:30:00.000Z',
    estado: 'COMPLETADA',
    observaciones: null,
    productos: [
      { id_lote: 'LOT-000003', nombre: 'Tequila Don Julio Reposado', categoria: 'Licores', cantidad: 1, precio: 240000, lote: 'LOT-000003', porcentajeIva: 5 },
      { id_lote: 'LOT-000002', nombre: 'Cerveza Club Colombia Dorada', categoria: 'Cerveza', cantidad: 4, precio: 8000, lote: 'LOT-000002', porcentajeIva: 19 }
    ],
    total: 272000
  },
  {
    id_venta: 'VTA-000002',
    id_cliente: 'CLI-00001',
    cliente: 'Andrés Pérez',
    id_jornada: null,
    id_usuario: null,
    usuario: 'N/A',
    id_metodo_pago: 2,
    fecha_hora_venta: '2026-09-07T11:15:00.000Z',
    estado: 'PENDIENTE',
    observaciones: null,
    productos: [
      { id_lote: 'LOT-000001', nombre: 'Aguardiente Antioqueño 750ml', categoria: 'Licores', cantidad: 2, precio: 65000, lote: 'LOT-000001', porcentajeIva: 5 }
    ],
    total: 130000
  }
];
