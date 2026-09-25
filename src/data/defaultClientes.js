// Catálogo semilla de Clientes, compartido entre ClientesPage (CRUD) y
// VentasPage (selector real de cliente — necesario porque la verificación
// de edad depende de fecha_nacimiento, no de un nombre libre).
// tipo_documento + numero_documento reflejan la UNIQUE compuesta real
// (uq_cliente_documento); nunca un solo campo "documento" libre.
export const defaultClientes = [
  { id_cliente: 1, tipo_documento: 'CC', numero_documento: '1017223344', nombre_completo: 'Andrés Pérez', telefono: '300 123 4567', correo: 'aperez@gmail.com', fecha_nacimiento: '1990-05-12', estado: 'Activo' },
  { id_cliente: 2, tipo_documento: 'CC', numero_documento: '1020445566', nombre_completo: 'Laura Gómez', telefono: '311 987 6543', correo: 'lgomez@gmail.com', fecha_nacimiento: '2008-11-03', estado: 'Activo' },
  { id_cliente: 3, tipo_documento: 'CC', numero_documento: '1033778899', nombre_completo: 'Santiago Ríos', telefono: '320 456 7890', correo: 'srios@gmail.com', fecha_nacimiento: '1985-02-20', estado: 'Inactivo' },
];
