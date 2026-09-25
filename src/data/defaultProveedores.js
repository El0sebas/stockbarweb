// Catálogo semilla de Proveedores, compartido entre ProveedoresPage (donde se
// administra) y ComprasFormModal (selector de proveedor al registrar una compra).
// Sin campo "contacto": proveedor no tiene esa columna en el esquema real,
// los contactos viven en contacto_proveedor (data/defaultContactosProveedor.js).
export const defaultProveedores = [
  {
    codigo: 'PROV-01',
    nombre: 'Distribuidora de Licores de Antioquia',
    nit_empresa: '900123456-1',
    telefono: '3104567890',
    correo: 'ventas@dlantioquia.com',
    estado: 'Activo'
  },
  {
    codigo: 'PROV-02',
    nombre: 'Importaciones Andinas S.A.S.',
    nit_empresa: '900654321-2',
    telefono: '3209876543',
    correo: 'contacto@impandinas.com',
    estado: 'Activo'
  },
  {
    codigo: 'PROV-03',
    nombre: 'Cervecería Nacional',
    nit_empresa: '890900123-4',
    telefono: '3001234567',
    correo: 'aruiz@cervecerianacional.co',
    estado: 'Inactivo'
  }
];
