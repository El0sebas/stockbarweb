// Catálogo semilla de Proveedores, compartido entre ProveedoresPage (donde se
// administra) y ComprasFormModal (selector de proveedor al registrar una compra).
// Campos alineados a las columnas reales de proveedor: nit, razon_social,
// nombre_comercial, ciudad, direccion, telefono_principal, correo_principal.
// Sin campo "contacto": los contactos viven en contacto_proveedor
// (data/defaultContactosProveedor.js).
export const defaultProveedores = [
  {
    codigo: 'PROV-01',
    nit: '900123456-1',
    razon_social: 'Distribuidora de Licores de Antioquia',
    nombre_comercial: 'Distrilicores Antioquia',
    ciudad: 'Medellín',
    direccion: 'Calle 45 # 12-34',
    telefono_principal: '3104567890',
    correo_principal: 'ventas@dlantioquia.com',
    estado: 'Activo'
  },
  {
    codigo: 'PROV-02',
    nit: '900654321-2',
    razon_social: 'Importaciones Andinas S.A.S.',
    nombre_comercial: null,
    ciudad: 'Bogotá',
    direccion: 'Carrera 7 # 20-15',
    telefono_principal: '3209876543',
    correo_principal: 'contacto@impandinas.com',
    estado: 'Activo'
  },
  {
    codigo: 'PROV-03',
    nit: '890900123-4',
    razon_social: 'Cervecería Nacional',
    nombre_comercial: null,
    ciudad: 'Cali',
    direccion: 'Av. 6N # 28-10',
    telefono_principal: '3001234567',
    correo_principal: 'aruiz@cervecerianacional.co',
    estado: 'Inactivo'
  }
];
