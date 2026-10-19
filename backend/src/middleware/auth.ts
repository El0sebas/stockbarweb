// Módulo de Seguridad (C3): autenticación JWT + autorización RBAC en
// middleware, antes de llegar a cualquier controlador.
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../errors.js';
import { seguridadRepo, type SesionUsuario } from '../repositories/seguridad.repository.js';

declare global {
  namespace Express {
    interface Request {
      usuario?: SesionUsuario;
      token?: jwt.JwtPayload;
    }
  }
}

export type Permiso =
  | 'GESTIONAR_ROLES'
  | 'GESTIONAR_USUARIOS'
  | 'GESTIONAR_CATEGORIAS'
  | 'GESTIONAR_PRODUCTOS'
  | 'GESTIONAR_PROVEEDORES'
  | 'GESTIONAR_COMPRAS'
  | 'GESTIONAR_BAJAS'
  | 'GESTIONAR_CLIENTES'
  | 'GESTIONAR_VENTAS'
  | 'GESTIONAR_JORNADAS'
  | 'VER_REPORTES';

export const firmarToken = (idUsuario: string, huella: string) =>
  jwt.sign({ huella }, config.jwtSecret, {
    subject: idUsuario, jwtid: randomUUID(), expiresIn: config.jwtExpira as any, algorithm: 'HS256',
  });

// Tokens cerrados con logout (jti -> vencimiento), sin tocar la BD.
// shortcut: vive en memoria; un reinicio la vacía (un token cerrado vuelve a
// valer hasta su vencimiento) y no se comparte entre réplicas. Con varias
// instancias de la API, moverla a Redis.
const revocados = new Map<string, number>();

export function revocarToken(token: jwt.JwtPayload) {
  const ahora = Date.now();
  for (const [jti, vence] of revocados) if (vence <= ahora) revocados.delete(jti);
  if (token.jti && token.exp) revocados.set(token.jti, token.exp * 1000);
}

export const autenticar: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Debe iniciar sesión');
  let token: jwt.JwtPayload;
  try {
    token = jwt.verify(header.slice(7), config.jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
  } catch {
    throw new HttpError(401, 'La sesión expiró o no es válida. Inicie sesión de nuevo.');
  }
  if (token.jti && revocados.has(token.jti)) throw new HttpError(401, 'La sesión fue cerrada. Inicie sesión de nuevo.');
  const fila = token.sub ? await seguridadRepo.sesion(token.sub) : null;
  if (!fila) throw new HttpError(401, 'El usuario está inactivo o ya no existe.');
  const { huella, ...usuario } = fila;
  if (token.huella !== huella) throw new HttpError(401, 'La contraseña cambió. Inicie sesión de nuevo.');
  req.usuario = usuario;
  req.token = token;
  next();
};

// Basta con tener uno de los permisos listados.
export const requierePermiso =
  (...permisos: Permiso[]): RequestHandler<any> =>
  (req, _res, next) => {
    if (!permisos.some((p) => req.usuario!.permisos.includes(p))) {
      throw new HttpError(403, 'No tiene permisos para realizar esta acción.');
    }
    next();
  };
