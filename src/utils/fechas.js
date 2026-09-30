// Compara solo la parte de fecha (YYYY-MM-DD), sirve tanto para timestamps
// ISO completos (fecha_hora_venta) como para fechas planas (fecha_compra).
// La comparación de strings funciona correctamente en este formato porque
// es lexicográficamente igual al orden cronológico.
export const estaEnRangoFecha = (fecha, desde, hasta) => {
  if (!fecha) return true;
  const soloFecha = String(fecha).slice(0, 10);
  if (desde && soloFecha < desde) return false;
  if (hasta && soloFecha > hasta) return false;
  return true;
};
