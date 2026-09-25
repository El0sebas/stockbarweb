// Espejo de la restricción de unicidad condicional sobre jornada.estado:
// solo puede existir una fila ABIERTA a la vez.
export const getJornadaAbierta = (jornadas) => (jornadas || []).find((j) => j.estado === 'ABIERTA') || null;
