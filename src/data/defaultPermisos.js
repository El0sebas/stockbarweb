// Catálogo fijo de permiso — idéntico al INSERT INTO permiso de
// scripts/sch.sql. RolFormModal debe construir su checklist desde esta
// lista real, nunca con nombres de módulo libres inventados en el mock.
export const defaultPermisos = [
  { id_permiso: 1, nombre: 'GESTIONAR_ROLES', descripcion: 'Registrar, editar, consultar y administrar roles y permisos', modulo: 'SEGURIDAD' },
  { id_permiso: 2, nombre: 'GESTIONAR_USUARIOS', descripcion: 'Registrar, editar, consultar y administrar usuarios', modulo: 'SEGURIDAD' },
  { id_permiso: 3, nombre: 'GESTIONAR_CATEGORIAS', descripcion: 'Administrar categorías de productos', modulo: 'COMPRAS' },
  { id_permiso: 4, nombre: 'GESTIONAR_PRODUCTOS', descripcion: 'Administrar productos y existencias', modulo: 'COMPRAS' },
  { id_permiso: 5, nombre: 'GESTIONAR_PROVEEDORES', descripcion: 'Administrar proveedores y contactos', modulo: 'COMPRAS' },
  { id_permiso: 6, nombre: 'GESTIONAR_COMPRAS', descripcion: 'Registrar y administrar compras', modulo: 'COMPRAS' },
  { id_permiso: 7, nombre: 'GESTIONAR_CLIENTES', descripcion: 'Administrar clientes', modulo: 'VENTAS' },
  { id_permiso: 8, nombre: 'GESTIONAR_VENTAS', descripcion: 'Registrar y administrar ventas', modulo: 'VENTAS' },
  { id_permiso: 9, nombre: 'VER_REPORTES', descripcion: 'Consultar dashboard y reportes', modulo: 'DASHBOARD' },
];
