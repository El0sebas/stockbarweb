// Roles semilla del sistema (coinciden con el seed de scripts/sch.sql:
// 'Administrador' y 'Empleado_Auxiliar'). Compartido entre RolesPage (catálogo
// editable) y los formularios de Usuarios, para que el selector de rol de un
// usuario siempre refleje los roles que realmente existen en el sistema.
export const defaultRoles = [
  {
    codigo: 'ROL-01',
    nombre: 'Administrador',
    descripcion: 'Acceso total a todos los módulos y configuraciones del sistema.',
    permisos: ['Roles', 'Usuarios', 'Categorías', 'Productos', 'Proveedores', 'Compras', 'Clientes', 'Ventas', 'Reportes'],
    isSystem: true
  },
  {
    codigo: 'ROL-02',
    nombre: 'Empleado_Auxiliar',
    descripcion: 'Acceso operativo restringido a ventas y clientes en el punto de venta.',
    permisos: ['Productos', 'Clientes', 'Ventas'],
    isSystem: false
  }
];
