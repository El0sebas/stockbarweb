// Módulo de Seguridad — Subprocesos de Roles (CU_01_xx) y Usuarios (CU_09_xx).
import bcrypt from 'bcryptjs';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { withTx } from '../db.js';
import { HttpError, noEncontrado } from '../errors.js';
import { enviarCorreo } from '../mail.js';
import { requierePermiso } from '../middleware/auth.js';
import { seguridadRepo } from '../repositories/seguridad.repository.js';
import { contrasena, correo, estado, opcional, texto, tipoDocumento } from '../validate.js';

const r = Router();
const ROL_ADMIN = 'ADMINISTRADOR';

// ---------------------------------------------------------------- Roles
const idRol = z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,10}$/, 'Identificación del rol: 2 a 10 caracteres A-Z, 0-9, _ o -');
const rolBody = z.object({
  id_rol: idRol.optional(),
  nombre: texto(40).transform((v) => v.toUpperCase()),
  permisos: z.array(z.string().regex(/^[A-Z_]{3,30}$/)).min(1, 'Debe asignar al menos un permiso'),
});

r.get('/permisos', requierePermiso('GESTIONAR_ROLES'), async (_req, res) => {
  res.json(await seguridadRepo.permisos());
});

// También lo usa el formulario de usuarios (selector de rol).
r.get('/roles', requierePermiso('GESTIONAR_ROLES', 'GESTIONAR_USUARIOS'), async (_req, res) => {
  res.json(await seguridadRepo.roles());
});

r.get('/roles/:id', requierePermiso('GESTIONAR_ROLES'), async (req, res) => {
  const [rol] = await seguridadRepo.roles(req.params.id);
  if (!rol) throw noEncontrado('El rol solicitado');
  res.json(rol);
});

// Un rol no existe sin permisos: rol + rol_permiso en una sola transacción.
r.post('/roles', requierePermiso('GESTIONAR_ROLES'), async (req, res) => {
  const body = rolBody.parse(req.body);
  const id = await withTx(async (conn) => {
    const idNuevo = body.id_rol ?? (await seguridadRepo.siguienteIdRol(conn));
    await seguridadRepo.crearRol(conn, idNuevo, body.nombre, body.permisos);
    return idNuevo;
  });
  res.status(201).json((await seguridadRepo.roles(id))[0]);
});

r.put('/roles/:id', requierePermiso('GESTIONAR_ROLES'), async (req, res) => {
  const body = rolBody.parse(req.body);
  const id = await withTx(async (conn) => {
    const rol = await seguridadRepo.rolParaEditar(conn, req.params.id);
    if (!rol) throw noEncontrado('El rol seleccionado');
    if (rol.nombre === ROL_ADMIN) throw new HttpError(422, 'El rol de Administrador no se puede modificar');
    const nuevoId = body.id_rol ?? rol.id_rol;
    await seguridadRepo.actualizarRol(conn, rol.id_rol, nuevoId, body.nombre, body.permisos);
    return nuevoId;
  });
  res.json((await seguridadRepo.roles(id))[0]);
});

// trg_proteger_rol_administrador impide desactivar ADMINISTRADOR.
r.patch('/roles/:id/estado', requierePermiso('GESTIONAR_ROLES'), async (req, res) => {
  const body = estado.parse(req.body);
  const r1 = await seguridadRepo.cambiarEstadoRol(req.params.id, body.estado);
  if (!r1.affectedRows) throw noEncontrado('El rol seleccionado');
  res.json({ mensaje: `Estado actualizado a ${body.estado ? 'Activo' : 'Inactivo'}` });
});

r.delete('/roles/:id', requierePermiso('GESTIONAR_ROLES'), async (req, res) => {
  await withTx(async (conn) => {
    const [rol] = await seguridadRepo.roles(req.params.id);
    if (!rol) throw noEncontrado('El rol seleccionado');
    if (rol.nombre === ROL_ADMIN) throw new HttpError(422, 'El rol de Administrador no se puede eliminar');
    if (rol.usuarios > 0) {
      throw new HttpError(409, 'No es posible eliminar el rol porque se encuentra asociado a usuarios');
    }
    await seguridadRepo.eliminarRol(conn, rol.id_rol);
  });
  res.json({ mensaje: 'Rol eliminado exitosamente' });
});

// ---------------------------------------------------------------- Usuarios
// Solo un Administrador asigna el rol Administrador o gestiona la cuenta de
// otro administrador: GESTIONAR_USUARIOS no basta para escalar privilegios.
async function exigirAdminSiAplica(req: Request<any>, idRolNuevo?: string, destino?: { rol: string }) {
  if (req.usuario!.rol === ROL_ADMIN) return;
  const rolNuevo = idRolNuevo ? (await seguridadRepo.roles(idRolNuevo))[0]?.nombre : undefined;
  if (rolNuevo === ROL_ADMIN || destino?.rol === ROL_ADMIN) {
    throw new HttpError(403, 'Solo un administrador puede asignar el rol Administrador o gestionar a otro administrador');
  }
}

const usuarioBody = z.object({
  tipo_documento: tipoDocumento.default('CC'),
  numero_documento: texto(20),
  nombres: texto(60),
  apellidos: texto(60),
  correo,
  telefono: opcional(20),
  id_rol: idRol,
});

r.get('/usuarios', requierePermiso('GESTIONAR_USUARIOS'), async (req, res) => {
  const f = z
    .object({ q: z.string().trim().max(100).optional(), id_rol: z.string().max(10).optional(), estado: z.enum(['true', 'false']).optional() })
    .parse(req.query);
  res.json(await seguridadRepo.usuarios({ ...f, estado: f.estado === undefined ? undefined : f.estado === 'true' }));
});

r.get('/usuarios/:id', requierePermiso('GESTIONAR_USUARIOS'), async (req, res) => {
  const usuario = await seguridadRepo.usuario(req.params.id);
  if (!usuario) throw noEncontrado('El usuario solicitado');
  res.json(usuario);
});

r.post('/usuarios', requierePermiso('GESTIONAR_USUARIOS'), async (req, res) => {
  const body = usuarioBody.extend({ contrasena }).parse(req.body);
  await exigirAdminSiAplica(req, body.id_rol);
  const hash = await bcrypt.hash(body.contrasena, 12);
  const id = await withTx((conn) => seguridadRepo.crearUsuario(conn, body, hash));
  // Bienvenida (HU_69): sin la contraseña; si la olvida usa la recuperación.
  enviarCorreo(
    body.correo,
    'Bienvenido a StockBar',
    `Hola ${body.nombres}:\n\nSe creó tu cuenta en StockBar. Tu usuario es ${body.correo}.\n` +
      'Pide la contraseña inicial al administrador, o usa "¿Olvidaste tu contraseña?" en la pantalla de inicio.',
  ).catch((e) => console.error('No se pudo enviar el correo de bienvenida:', e));
  res.status(201).json(await seguridadRepo.usuario(id));
});

// Contraseña vacía u omitida = se conserva la actual (CU_09_03).
r.put('/usuarios/:id', requierePermiso('GESTIONAR_USUARIOS'), async (req, res) => {
  const body = usuarioBody.extend({ contrasena: z.union([z.literal(''), contrasena]).optional() }).parse(req.body);
  const actual = await seguridadRepo.usuario(req.params.id);
  if (!actual) throw noEncontrado('El usuario seleccionado');
  await exigirAdminSiAplica(req, body.id_rol, actual);
  if (actual.es_admin_principal && actual.id_usuario !== req.usuario!.id_usuario) {
    throw new HttpError(403, 'Solo el administrador principal puede modificar su propia cuenta');
  }
  if (actual.es_admin_principal && body.id_rol !== actual.id_rol) {
    throw new HttpError(422, 'El rol del administrador principal no se puede cambiar');
  }
  const hash = body.contrasena ? await bcrypt.hash(body.contrasena, 12) : null;
  await seguridadRepo.actualizarUsuario(req.params.id, body, hash);
  res.json(await seguridadRepo.usuario(req.params.id));
});

// CU_09_08: solo un Administrador desactiva, nadie se desactiva a sí mismo y
// el admin principal está protegido (trg_proteger_admin_principal).
r.patch('/usuarios/:id/estado', requierePermiso('GESTIONAR_USUARIOS'), async (req, res) => {
  const body = estado.parse(req.body);
  if (!body.estado) {
    if (req.usuario!.rol !== ROL_ADMIN) throw new HttpError(403, 'Solo un administrador puede desactivar usuarios');
    if (req.params.id === req.usuario!.id_usuario) throw new HttpError(422, 'No puedes desactivarte a ti mismo');
  }
  const destino = await seguridadRepo.usuario(req.params.id);
  if (!destino) throw noEncontrado('El usuario seleccionado');
  await exigirAdminSiAplica(req, undefined, destino);
  const r1 = await seguridadRepo.cambiarEstadoUsuario(req.params.id, body.estado);
  if (!r1.affectedRows) throw noEncontrado('El usuario seleccionado');
  res.json({ mensaje: body.estado ? 'Usuario activado exitosamente' : 'Usuario inactivado exitosamente' });
});

// Si el usuario ya registró compras, ventas, jornadas o bajas, la FK lo
// impide (409): en ese caso se desactiva en vez de eliminar.
r.delete('/usuarios/:id', requierePermiso('GESTIONAR_USUARIOS'), async (req, res) => {
  const usuario = await seguridadRepo.usuario(req.params.id);
  if (!usuario) throw noEncontrado('El usuario seleccionado');
  if (usuario.es_admin_principal) throw new HttpError(422, 'El administrador principal del sistema no puede eliminarse');
  if (usuario.id_usuario === req.usuario!.id_usuario) throw new HttpError(422, 'No puedes eliminarte a ti mismo');
  await exigirAdminSiAplica(req, undefined, usuario);
  await seguridadRepo.eliminarUsuario(usuario.id_usuario);
  res.json({ mensaje: 'Usuario eliminado exitosamente' });
});

export default r;
