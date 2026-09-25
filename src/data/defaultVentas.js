// Datos semilla de Ventas. Anteriores a que existiera Jornada en el
// prototipo, así que id_jornada queda en null (no coinciden con ninguna
// jornada real y por lo tanto no aparecen en ningún resumen de cierre —
// es el comportamiento correcto para datos históricos previos al módulo).
// pagos[] y estado PENDIENTE/COMPLETADA/ANULADA reflejan venta/venta_pago
// reales; porcentajeIva queda congelada por línea igual que
// detalle_venta.porcentaje_impuesto_aplicado.
export const defaultVentas = [
  {
    id_venta: 1,
    idVenta: 'VNT-001',
    id_cliente: null,
    cliente: 'Alejandro Giraldo',
    id_jornada: null,
    id_usuario: null,
    usuario: 'N/A',
    fecha_hora_venta: '2026-09-07T10:30:00.000Z',
    estado: 'COMPLETADA',
    observaciones: null,
    productos: [
      { id_lote: 3, nombre: 'Tequila Don Julio Reposado', categoria: 'Licores', cantidad: 1, precio: 240000, lote: 'TQ-045', porcentajeIva: 5 },
      { id_lote: 2, nombre: 'Cerveza Club Colombia Dorada', categoria: 'Cerveza', cantidad: 4, precio: 8000, lote: 'CR-110', porcentajeIva: 19 }
    ],
    pagos: [{ id_metodo_pago: 1, metodoPago: 'Efectivo', monto: 272000, referencia_transaccion: null }],
    total: 272000
  },
  {
    id_venta: 2,
    idVenta: 'VNT-002',
    id_cliente: 1,
    cliente: 'Andrés Pérez',
    id_jornada: null,
    id_usuario: null,
    usuario: 'N/A',
    fecha_hora_venta: '2026-09-07T11:15:00.000Z',
    estado: 'PENDIENTE',
    observaciones: null,
    productos: [
      { id_lote: 1, nombre: 'Aguardiente Antioqueño 750ml', categoria: 'Licores', cantidad: 2, precio: 65000, lote: 'AG-208', porcentajeIva: 5 }
    ],
    pagos: [],
    total: 130000
  }
];
