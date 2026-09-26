// Semilla de usuarios compartida entre Login (valida credenciales) y
// UsuariosPage (CRUD administrativo). Antes cada uno mantenía su propia lista
// desconectada: un usuario creado en Usuarios no podía iniciar sesión, y el
// admin por defecto de Login no aparecía en Usuarios. Ambos ahora leen/escriben
// la misma clave de localStorage ('stockbar_users') a través de usePersistentState.
export const defaultUsers = [
  {
    id_usuario: 1,
    documento: '1098765432',
    nombre: 'Carlos Andrés Gómez',
    correo: 'administrador@stockbar.com',
    telefono: '3104567890',
    rol: 'ADMINISTRADOR',
    password: '123456',
    estado: 'Activo',
    fechaRegistro: '2026-01-15',
    // Primer ADMINISTRADOR que existió en el sistema (lo crearía la app en
    // el arranque inicial). Nunca editable desde el UI; ni él mismo ni otro
    // administrador puede desactivarlo — ver docs/DATABASE.md.
    es_admin_principal: true
  }
];
