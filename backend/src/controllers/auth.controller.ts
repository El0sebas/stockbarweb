// Módulo de Seguridad — Subproceso de Acceso (CU_10_01..03).
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { HttpError } from '../errors.js';
import { enviarCorreo } from '../mail.js';
import { autenticar, firmarToken, revocarToken } from '../middleware/auth.js';
import { bajasRepo } from '../repositories/bajas.repository.js';
import { seguridadRepo } from '../repositories/seguridad.repository.js';
import { contrasena, correo } from '../validate.js';

const r = Router();

// Frena fuerza bruta sobre login y recuperación (por IP). Solo cuentan los
// intentos fallidos: todos los equipos del local salen por la misma IP.
const limitador = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true,
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espere unos minutos e intente de nuevo.' } });

// Cada solicitud de recuperación que sale bien envía un correo: se limitan
// todas (no solo las fallidas) para que nadie llene el buzón de un usuario.
const limitadorCorreo = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5,
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de recuperación. Espere unos minutos e intente de nuevo.' } });

// Hash ficticio: comparar siempre contra algo para que un correo inexistente
// tarde lo mismo que uno existente.
const HASH_FICTICIO = bcrypt.hashSync('contrasena-ficticia', 12);
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

r.post('/login', limitador, async (req, res) => {
  const body = z.object({ correo, contrasena: z.string().min(1).max(72) }).parse(req.body);
  const cred = await seguridadRepo.credenciales(body.correo);
  const ok = await bcrypt.compare(body.contrasena, cred?.contrasena_hash ?? HASH_FICTICIO);
  if (!cred || !ok) throw new HttpError(401, 'Credenciales inválidas o usuario inactivo');
  // Solo se revela que está inactivo a quien ya demostró la contraseña.
  if (!cred.estado) throw new HttpError(403, 'Este usuario se encuentra inactivo');
  if (!cred.rol_activo) throw new HttpError(403, 'El rol de este usuario se encuentra inactivo');

  // CU_10_01 paso 5: al iniciar sesión se dan de baja los lotes vencidos (HU_50).
  await bajasRepo.darBajaVencidos(cred.id_usuario).catch((e) => console.error('Baja automática de vencidos falló:', e));

  const { huella, ...usuario } = (await seguridadRepo.sesion(cred.id_usuario))!;
  res.json({ token: firmarToken(cred.id_usuario, huella), usuario });
});

// CU_10_02: genera un token de un solo uso (30 min) y lo envía por correo.
// Solo se guarda su hash.
r.post('/recuperar', limitadorCorreo, async (req, res) => {
  const body = z.object({ correo }).parse(req.body);
  const usuario = await seguridadRepo.usuarioActivoPorCorreo(body.correo);
  if (!usuario) throw new HttpError(404, 'No existe una cuenta registrada con ese correo');
  const token = randomBytes(32).toString('hex');
  await seguridadRepo.guardarTokenRecuperacion(usuario.id_usuario, hashToken(token), config.minutosTokenRecuperacion);
  await enviarCorreo(
    body.correo,
    'StockBar — Recuperación de contraseña',
    `Hola ${usuario.nombres}:\n\nTu token para restablecer la contraseña es:\n\n${token}\n\n` +
      `Vence en ${config.minutosTokenRecuperacion} minutos y solo sirve una vez. Si no lo solicitaste, ignora este correo.`,
  );
  res.json({ mensaje: 'Se envió un token de recuperación a tu correo.' });
});

r.post('/restablecer', limitador, async (req, res) => {
  const body = z
    .object({ token: z.string().trim().min(1, 'Debes ingresar el token y la nueva contraseña').max(128), contrasena })
    .parse(req.body);
  const fila = await seguridadRepo.tokenRecuperacion(hashToken(body.token));
  if (!fila) throw new HttpError(400, 'El token no existe o ya fue usado');
  if (!fila.vigente) {
    await seguridadRepo.limpiarTokenRecuperacion(fila.id_usuario);
    throw new HttpError(400, 'El token ha expirado. Solicita uno nuevo');
  }
  await seguridadRepo.restablecerContrasena(fila.id_usuario, await bcrypt.hash(body.contrasena, 12));
  res.json({ mensaje: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
});

// Perfil de la sesión (app móvil "Perfil" y recarga de la web).
r.get('/me', autenticar, (req, res) => {
  res.json(req.usuario);
});

// Revoca este token en el servidor (solo este dispositivo). No cierra la jornada (CU_10_03).
r.post('/logout', autenticar, (req, res) => {
  revocarToken(req.token!);
  res.status(204).end();
});

export default r;
