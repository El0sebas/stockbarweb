// Historial de jornadas (turnos de caja). Arranca vacío a propósito: es un
// registro transaccional (como baja_inventario), no un catálogo con datos
// de ejemplo fijos — el primer inicio de sesión siempre exige abrir una.
export const defaultJornadas = [];
