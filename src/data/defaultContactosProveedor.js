// Seed de contacto_proveedor. proveedor NO tiene columna "contacto" en el
// esquema real — los contactos siempre viven en esta tabla aparte, con a lo
// sumo uno marcado como principal+activo por proveedor (uq_contacto_principal_activo).
export const defaultContactosProveedor = [
  { id_contacto: 1, id_proveedor: 'PROV-01', nombres: 'Carlos', apellidos: 'Pérez', cargo: 'Gerente Comercial', telefono: '3104567890', correo: 'ventas@dlantioquia.com', es_principal: true, estado: 'Activo' },
  { id_contacto: 2, id_proveedor: 'PROV-02', nombres: 'María', apellidos: 'Gómez', cargo: 'Ejecutiva de Cuenta', telefono: '3209876543', correo: 'contacto@impandinas.com', es_principal: true, estado: 'Activo' },
];
