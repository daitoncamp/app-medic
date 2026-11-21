// ==================== SESIÓN (TOKEN EN COOKIE) ====================
// El token viaja en una cookie httpOnly: el código del navegador no puede leerla,
// así un script malicioso no puede robar la sesión.

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const NOMBRE_COOKIE = 'clinica_sesion';

const opcionesCookie = () => ({
  httpOnly: true,
  secure: config.esProduccion, // en producción solo por HTTPS
  sameSite: 'lax',
  path: '/',
  maxAge: config.sesionHoras * 3600 * 1000,
});

export function crearSesion(res, usuario) {
  const token = jwt.sign({ sub: usuario.id, rol: usuario.rol }, config.jwtSecret, {
    expiresIn: `${config.sesionHoras}h`,
  });
  res.cookie(NOMBRE_COOKIE, token, opcionesCookie());
}

export function cerrarSesion(res) {
  const { maxAge, ...opciones } = opcionesCookie(); // eslint-disable-line no-unused-vars
  res.clearCookie(NOMBRE_COOKIE, opciones);
}

/** Devuelve el contenido del token o null si no existe, expiró o fue alterado */
export function leerSesion(req) {
  const token = req.cookies?.[NOMBRE_COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

/** Datos del usuario que se envían al frontend (nunca el hash de la contraseña) */
export const usuarioPublico = (u) => ({
  id: u.id,
  nombre: u.nombre,
  email: u.email,
  rol: u.rol,
  activo: u.activo,
  debeCambiarPassword: u.debeCambiarPassword,
  ultimoAcceso: u.ultimoAcceso,
  creadoEn: u.creadoEn,
});
