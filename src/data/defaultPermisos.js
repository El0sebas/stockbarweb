// Catálogo fijo de permiso — idéntico al INSERT INTO permiso de
// scripts/sch.sql. Sin descripcion: no se usa en ningún formulario (el
// permiso solo se asigna a un rol desde la matriz, no se gestiona como
// entidad propia con ficha detallada). RolFormModal debe construir su
// checklist desde esta lista real, nunca con nombres de módulo libres.
export const defaultPermisos = [
  { id_permiso: 1, nombre: 'GESTIONAR_ROLES', modulo: 'SEGURIDAD' },
  { id_permiso: 2, nombre: 'GESTIONAR_USUARIOS', modulo: 'SEGURIDAD' },
  { id_permiso: 3, nombre: 'GESTIONAR_CATEGORIAS', modulo: 'COMPRAS' },
  { id_permiso: 4, nombre: 'GESTIONAR_PRODUCTOS', modulo: 'COMPRAS' },
  { id_permiso: 5, nombre: 'GESTIONAR_PROVEEDORES', modulo: 'COMPRAS' },
  { id_permiso: 6, nombre: 'GESTIONAR_COMPRAS', modulo: 'COMPRAS' },
  { id_permiso: 7, nombre: 'GESTIONAR_CLIENTES', modulo: 'VENTAS' },
  { id_permiso: 8, nombre: 'GESTIONAR_VENTAS', modulo: 'VENTAS' },
  { id_permiso: 9, nombre: 'VER_REPORTES', modulo: 'DASHBOARD' },
];
