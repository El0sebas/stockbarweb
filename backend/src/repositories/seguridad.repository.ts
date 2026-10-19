import type { PoolConnection } from 'mysql2/promise';
import { exec, like, nextId, q, q1, type Conn } from '../db.js';

export interface SesionUsuario {
  id_usuario: string;
  nombres: string;
  apellidos: string;
  correo: string;
  id_rol: string;
  rol: string;
  es_admin_principal: boolean;
  permisos: string[];
}

const COLS_USUARIO = `u.id_usuario, u.tipo_documento, u.numero_documento, u.nombres, u.apellidos,
  u.correo, u.telefono, u.id_rol, r.nombre AS rol, u.fecha_registro, u.estado, u.es_admin_principal`;

export interface DatosUsuario {
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string | null;
  id_rol: string;
}

async function asignarPermisos(conn: Conn, idRol: string, permisos: string[]) {
  await exec('DELETE FROM rol_permiso WHERE id_rol = ?', [idRol], conn);
  await exec('INSERT INTO rol_permiso (id_rol, id_permiso) VALUES ?', [permisos.map((p) => [idRol, p])], conn);
}

export const seguridadRepo = {
  // ---------- Sesión / acceso ----------
  // Solo usuarios activos con rol activo tienen sesión: desactivar un usuario
  // o su rol corta el acceso en la siguiente petición, aunque el JWT siga vigente.
  // huella: deriva del hash de la contraseña; si la contraseña cambia, los JWT
  // emitidos antes dejan de valer (nunca se envía al cliente).
  async sesion(idUsuario: string): Promise<(SesionUsuario & { huella: string }) | null> {
    const u = await q1(
      `SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.id_rol, r.nombre AS rol, u.es_admin_principal,
         LEFT(SHA2(u.contrasena_hash, 256), 16) AS huella
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ? AND u.estado AND r.estado`,
      [idUsuario],
    );
    if (!u) return null;
    const permisos = await q('SELECT id_permiso FROM rol_permiso WHERE id_rol = ?', [u.id_rol]);
    return { ...u, permisos: permisos.map((p) => p.id_permiso) };
  },

  credenciales: (correo: string) =>
    q1<{ id_usuario: string; contrasena_hash: string; estado: boolean; rol_activo: boolean }>(
      `SELECT u.id_usuario, u.contrasena_hash, u.estado, r.estado AS rol_activo
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol WHERE u.correo = ?`,
      [correo],
    ),

  usuarioActivoPorCorreo: (correo: string) =>
    q1<{ id_usuario: string; nombres: string }>(
      'SELECT id_usuario, nombres FROM usuario WHERE correo = ? AND estado',
      [correo],
    ),

  guardarTokenRecuperacion: (idUsuario: string, tokenHash: string, minutos: number) =>
    exec(
      `UPDATE usuario SET token_recuperacion_hash = ?,
         token_recuperacion_expira = NOW() + INTERVAL ? MINUTE WHERE id_usuario = ?`,
      [tokenHash, minutos, idUsuario],
    ),

  // Devuelve el estado del token: vigente, vencido o inexistente/usado.
  tokenRecuperacion: (tokenHash: string) =>
    q1<{ id_usuario: string; vigente: boolean }>(
      `SELECT id_usuario, (token_recuperacion_expira > NOW()) AS vigente
       FROM usuario WHERE token_recuperacion_hash = ? AND estado`,
      [tokenHash],
    ),

  // Un solo uso: al restablecer (o vencer) ambas columnas vuelven a NULL.
  restablecerContrasena: (idUsuario: string, contrasenaHash: string) =>
    exec(
      `UPDATE usuario SET contrasena_hash = ?, token_recuperacion_hash = NULL,
         token_recuperacion_expira = NULL WHERE id_usuario = ?`,
      [contrasenaHash, idUsuario],
    ),

  limpiarTokenRecuperacion: (idUsuario: string) =>
    exec(
      'UPDATE usuario SET token_recuperacion_hash = NULL, token_recuperacion_expira = NULL WHERE id_usuario = ?',
      [idUsuario],
    ),

  // ---------- Permisos y roles ----------
  permisos: () => q('SELECT id_permiso, modulo FROM permiso ORDER BY modulo, id_permiso'),

  async roles(idRol?: string) {
    const roles = await q(
      `SELECT r.id_rol, r.nombre, r.estado,
         (SELECT COUNT(*) FROM usuario u WHERE u.id_rol = r.id_rol) AS usuarios
       FROM rol r ${idRol ? 'WHERE r.id_rol = ?' : ''} ORDER BY r.nombre`,
      idRol ? [idRol] : [],
    );
    const rp = await q('SELECT id_rol, id_permiso FROM rol_permiso');
    return roles.map((r) => ({
      ...r,
      permisos: rp.filter((x) => x.id_rol === r.id_rol).map((x) => x.id_permiso),
    }));
  },

  rolParaEditar: (conn: Conn, idRol: string) =>
    q1<{ id_rol: string; nombre: string }>('SELECT id_rol, nombre FROM rol WHERE id_rol = ? FOR UPDATE', [idRol], conn),

  siguienteIdRol: (conn: PoolConnection) => nextId(conn, 'rol', 'id_rol', 'ROL', 2),

  async crearRol(conn: Conn, idRol: string, nombre: string, permisos: string[]) {
    await exec('INSERT INTO rol (id_rol, nombre) VALUES (?, ?)', [idRol, nombre], conn);
    await asignarPermisos(conn, idRol, permisos);
  },

  // Cambiar id_rol se propaga a rol_permiso y usuario (ON UPDATE CASCADE, HU_04).
  async actualizarRol(conn: Conn, idRol: string, nuevoId: string, nombre: string, permisos: string[]) {
    await exec('UPDATE rol SET id_rol = ?, nombre = ? WHERE id_rol = ?', [nuevoId, nombre, idRol], conn);
    await asignarPermisos(conn, nuevoId, permisos);
  },

  cambiarEstadoRol: (idRol: string, estado: boolean) =>
    exec('UPDATE rol SET estado = ? WHERE id_rol = ?', [estado, idRol]),

  async eliminarRol(conn: Conn, idRol: string) {
    await exec('DELETE FROM rol_permiso WHERE id_rol = ?', [idRol], conn);
    return exec('DELETE FROM rol WHERE id_rol = ?', [idRol], conn);
  },

  // ---------- Usuarios ----------
  usuarios: (f: { q?: string; id_rol?: string; estado?: boolean }) =>
    q(
      `SELECT ${COLS_USUARIO} FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
       WHERE (? IS NULL OR u.id_rol = ?)
         AND (? IS NULL OR u.estado = ?)
         AND (? IS NULL OR CONCAT_WS(' ', u.nombres, u.apellidos, u.correo, u.numero_documento, r.nombre) LIKE ?)
       ORDER BY u.nombres, u.apellidos`,
      [f.id_rol ?? null, f.id_rol ?? null, f.estado ?? null, f.estado ?? null, like(f.q), like(f.q)],
    ),

  usuario: (idUsuario: string, conn?: Conn) =>
    q1(`SELECT ${COLS_USUARIO} FROM usuario u JOIN rol r ON r.id_rol = u.id_rol WHERE u.id_usuario = ?`, [idUsuario], conn),

  hayUsuarios: async () => !!(await q1('SELECT 1 FROM usuario LIMIT 1')),

  adminPrincipal: () => q1<{ id_usuario: string }>('SELECT id_usuario FROM usuario WHERE es_admin_principal'),

  async crearUsuario(conn: PoolConnection, u: DatosUsuario, contrasenaHash: string, esAdminPrincipal = false) {
    const id = await nextId(conn, 'usuario', 'id_usuario', 'USR', 4);
    await exec(
      `INSERT INTO usuario (id_usuario, tipo_documento, numero_documento, nombres, apellidos, correo,
         telefono, id_rol, contrasena_hash, es_admin_principal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, u.tipo_documento, u.numero_documento, u.nombres, u.apellidos, u.correo, u.telefono, u.id_rol,
        contrasenaHash, esAdminPrincipal],
      conn,
    );
    return id;
  },

  // contrasenaHash null = conservar la contraseña actual (CU_09_03).
  actualizarUsuario: (idUsuario: string, u: DatosUsuario, contrasenaHash: string | null) =>
    exec(
      `UPDATE usuario SET tipo_documento = ?, numero_documento = ?, nombres = ?, apellidos = ?, correo = ?,
         telefono = ?, id_rol = ?, contrasena_hash = COALESCE(?, contrasena_hash) WHERE id_usuario = ?`,
      [u.tipo_documento, u.numero_documento, u.nombres, u.apellidos, u.correo, u.telefono, u.id_rol,
        contrasenaHash, idUsuario],
    ),

  cambiarEstadoUsuario: (idUsuario: string, estado: boolean) =>
    exec('UPDATE usuario SET estado = ? WHERE id_usuario = ?', [estado, idUsuario]),

  eliminarUsuario: (idUsuario: string) => exec('DELETE FROM usuario WHERE id_usuario = ?', [idUsuario]),
};
