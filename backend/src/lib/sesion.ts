// ==================== SESIÓN (TOKEN EN COOKIE) ====================
// El token viaja en una cookie httpOnly: el código del navegador no puede leerla,
// así un script malicioso no puede robar la sesión.

import type { CookieOptions, Request, Response } from 'express';
import type { Rol, Usuario } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.ts';

export const NOMBRE_COOKIE = 'clinica_sesion';

/** Contenido del token: id y rol del usuario */
export interface DatosSesion {
  sub: string;
  rol: Rol;
}

const opcionesCookie = (): CookieOptions => ({
  httpOnly: true,
  secure: config.esProduccion, // en producción solo por HTTPS
  sameSite: 'lax',
  path: '/',
  maxAge: config.sesionHoras * 3600 * 1000,
});

export function crearSesion(res: Response, usuario: Pick<Usuario, 'id' | 'rol'>): void {
  const token = jwt.sign({ sub: usuario.id, rol: usuario.rol }, config.jwtSecret, {
    expiresIn: `${config.sesionHoras}h`,
  });
  res.cookie(NOMBRE_COOKIE, token, opcionesCookie());
}

export function cerrarSesion(res: Response): void {
  const { maxAge, ...opciones } = opcionesCookie(); // eslint-disable-line no-unused-vars
  res.clearCookie(NOMBRE_COOKIE, opciones);
}

/** Devuelve el contenido del token o null si no existe, expiró o fue alterado */
export function leerSesion(req: Request): DatosSesion | null {
  const token: unknown = req.cookies?.[NOMBRE_COOKIE];
  if (typeof token !== 'string') return null;
  try {
    const datos = jwt.verify(token, config.jwtSecret);
    return typeof datos === 'object' && typeof datos.sub === 'string' ? (datos as DatosSesion) : null;
  } catch {
    return null;
  }
}

/** Datos del usuario que se envían al frontend (nunca el hash de la contraseña) */
export const usuarioPublico = (u: Usuario) => ({
  id: u.id,
  nombre: u.nombre,
  email: u.email,
  rol: u.rol,
  activo: u.activo,
  debeCambiarPassword: u.debeCambiarPassword,
  ultimoAcceso: u.ultimoAcceso,
  creadoEn: u.creadoEn,
});
