// El nombre real del permiso (GESTIONAR_ROLES) es el código que guarda la
// BD — nunca se cambia. Esto es solo para mostrarlo legible en la UI
// (RolFormModal, RolDetailModal), sin el guion bajo.
export const humanizarPermiso = (nombre) =>
  nombre.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
