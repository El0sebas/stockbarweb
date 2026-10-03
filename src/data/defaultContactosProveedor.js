// Seed de contacto_proveedor. proveedor NO tiene columna "contacto" en el
// esquema real — los contactos siempre viven en esta tabla aparte, con a lo
// sumo uno marcado como principal+activo por proveedor (uq_contacto_principal_activo).
// v3: PK compuesta (id_proveedor, nro_contacto) — nro_contacto es un
// consecutivo POR PROVEEDOR, no un id global; id_proveedor ES el NIT.
export const defaultContactosProveedor = [
  { nro_contacto: 1, id_proveedor: '900123456-1', nombres: 'Carlos', apellidos: 'Pérez', cargo: 'Gerente Comercial', telefono: '3104567890', correo: 'ventas@dlantioquia.com', es_principal: true, estado: 'Activo' },
  { nro_contacto: 1, id_proveedor: '900654321-2', nombres: 'María', apellidos: 'Gómez', cargo: 'Ejecutiva de Cuenta', telefono: '3209876543', correo: 'contacto@impandinas.com', es_principal: true, estado: 'Activo' },
];
