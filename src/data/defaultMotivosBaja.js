// Catálogo fijo de motivo_baja (scripts/sch.sql): el formulario de Bajas debe
// elegir de esta lista, nunca aceptar un motivo como texto libre.
export const defaultMotivosBaja = [
  { id_motivo_baja: 1, nombre: 'Vencimiento' },
  { id_motivo_baja: 2, nombre: 'Daño/Rotura' },
  { id_motivo_baja: 3, nombre: 'Ajuste de inventario' },
  { id_motivo_baja: 4, nombre: 'Pérdida/Robo' }
];
