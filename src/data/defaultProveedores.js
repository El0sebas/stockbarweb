// Catálogo semilla de Proveedores, compartido entre ProveedoresPage (donde se
// administra) y ComprasFormModal (selector de proveedor al registrar una compra).
export const defaultProveedores = [
  {
    codigo: 'PROV-01',
    nombre: 'Distribuidora de Licores de Antioquia',
    contacto: 'Carlos Pérez',
    telefono: '3104567890',
    correo: 'ventas@dlantioquia.com',
    estado: 'Activo'
  },
  {
    codigo: 'PROV-02',
    nombre: 'Importaciones Andinas S.A.S.',
    contacto: 'María Gómez',
    telefono: '3209876543',
    correo: 'contacto@impandinas.com',
    estado: 'Activo'
  },
  {
    codigo: 'PROV-03',
    nombre: 'Cervecería Nacional',
    contacto: 'Andrés Ruiz',
    telefono: '3001234567',
    correo: 'aruiz@cervecerianacional.co',
    estado: 'Inactivo'
  }
];
