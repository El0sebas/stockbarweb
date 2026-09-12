// Catálogo de métodos de pago, compartido entre MetodosPagoPage (donde se
// administra) y los formularios de Ventas/Compras (donde se seleccionan).
// Antes cada pantalla tenía su propia lista fija y desconectada; ahora todas
// leen/escriben 'stockbar_metodos_pago', así que activar/crear/desactivar un
// método aquí se refleja de inmediato en los selectores de Ventas y Compras.
// Incluye, como semilla, el ENUM documentado en docs/DATABASE.md
// (efectivo, nequi, bancolombia, transferencia, otro) más variantes comunes.
export const defaultMetodosPago = [
  { id_metodo_pago: 1, nombre: 'Efectivo', estado: 'Activo' },
  { id_metodo_pago: 2, nombre: 'Nequi', estado: 'Activo' },
  { id_metodo_pago: 3, nombre: 'Bancolombia', estado: 'Activo' },
  { id_metodo_pago: 4, nombre: 'Transferencia', estado: 'Activo' },
  { id_metodo_pago: 5, nombre: 'Tarjeta Débito', estado: 'Activo' },
  { id_metodo_pago: 6, nombre: 'Tarjeta Crédito', estado: 'Inactivo' },
  { id_metodo_pago: 7, nombre: 'Otro', estado: 'Activo' },
];
