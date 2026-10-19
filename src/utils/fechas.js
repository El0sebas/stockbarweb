// Compara solo la parte de fecha (YYYY-MM-DD), sirve tanto para timestamps
// ISO completos (fecha_hora_venta) como para fechas planas (fecha_compra).
// La comparación de strings funciona correctamente en este formato porque
// es lexicográficamente igual al orden cronológico.
// Los timestamps llegan en UTC: se pasan a la fecha local, o una venta de
// las 9 p. m. en Colombia caería en el día siguiente.
export const fechaLocal = (fecha) =>
  String(fecha).includes('T') ? new Date(fecha).toLocaleDateString('sv-SE') : String(fecha).slice(0, 10);

export const estaEnRangoFecha = (fecha, desde, hasta) => {
  if (!fecha) return true;
  const soloFecha = fechaLocal(fecha);
  if (desde && soloFecha < desde) return false;
  if (hasta && soloFecha > hasta) return false;
  return true;
};
