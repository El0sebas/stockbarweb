// Roles semilla del sistema (coinciden con el seed de scripts/sch.sql:
// 'ADMINISTRADOR' y 'EMPLEADO'). Compartido entre RolesPage (catálogo
// editable) y los formularios de Usuarios, para que el selector de rol de un
// usuario siempre refleje los roles que realmente existen en el sistema.
// Sin descripcion: decisión explícita del negocio (rol.descripcion no
// existe en el esquema — ni siquiera lo menciona la matriz como columna,
// solo como campo de formulario descartado).
// permisos guarda nombres reales de la tabla permiso (data/defaultPermisos.js),
// nunca nombres de módulo inventados. EMPLEADO recibe exactamente lo que el
// INSERT INTO rol_permiso de scripts/sch.sql le asigna (GESTIONAR_CLIENTES +
// GESTIONAR_VENTAS) — no queda sin ningún permiso.
export const defaultRoles = [
  {
    codigo: 'ROL-01',
    nombre: 'ADMINISTRADOR',
    permisos: ['GESTIONAR_ROLES', 'GESTIONAR_USUARIOS', 'GESTIONAR_CATEGORIAS', 'GESTIONAR_PRODUCTOS', 'GESTIONAR_PROVEEDORES', 'GESTIONAR_COMPRAS', 'GESTIONAR_CLIENTES', 'GESTIONAR_VENTAS', 'VER_REPORTES'],
    estado: 'Activo',
    isSystem: true
  },
  {
    codigo: 'ROL-02',
    nombre: 'EMPLEADO',
    permisos: ['GESTIONAR_CLIENTES', 'GESTIONAR_VENTAS'],
    estado: 'Activo',
    isSystem: false
  }
];
