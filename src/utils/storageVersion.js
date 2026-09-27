// Bump STORAGE_VERSION cada vez que la forma de los datos mock persistidos
// cambie de forma incompatible (columnas renombradas/eliminadas, no solo
// agregadas). Al arrancar, si la versión guardada no coincide, se limpia
// todo stockbar_* una sola vez para que se re-siembre con los defaults
// nuevos — evita repetir el bug de "el navegador quedó con datos viejos e
// incompatibles" cada vez que el esquema cambia (pasó con proveedores,
// clientes y compras en la misma sesión).
const STORAGE_VERSION = 4;
const VERSION_KEY = 'stockbar_storage_version';

export const ensureStorageVersion = () => {
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored === String(STORAGE_VERSION)) return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith('stockbar_'))
      .forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
  } catch {
    // localStorage no disponible (modo privado, cuota excedida, etc.): no
    // bloquea el arranque, simplemente no hay persistencia entre sesiones.
  }
};
