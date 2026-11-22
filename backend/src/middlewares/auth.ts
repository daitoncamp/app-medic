// ==================== PROTECCIÓN DE RUTAS ====================
import type { NextFunction, Request, Response } from 'express';
import type { Rol, Usuario } from '@prisma/client';
import { prisma } from '../lib/prisma.ts';
import { noAutorizado, prohibido } from '../lib/errores.ts';
import { cerrarSesion, leerSesion } from '../lib/sesion.ts';

/**
 * Exige una sesión válida. Consulta al usuario en cada petición para que
 * desactivarlo o cambiarle el rol tenga efecto inmediato.
 * Deja el usuario en req.usuario.
 */
export async function autenticar(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sesion = leerSesion(req);
  if (!sesion) throw noAutorizado();

  const usuario = await prisma.usuario.findUnique({ where: { id: sesion.sub } });
  if (!usuario || !usuario.activo) {
    cerrarSesion(res);
    throw noAutorizado('Tu sesión ya no es válida. Vuelve a iniciar sesión.');
  }
  req.usuario = usuario;
  next();
}

/** Usuario de la sesión en una ruta protegida (autenticar ya lo dejó en req.usuario) */
export function usuarioDe(req: Request): Usuario {
  if (!req.usuario) throw noAutorizado();
  return req.usuario;
}

/** Solo deja pasar a los roles indicados: requiereRol('ADMIN', 'RECEPCIONISTA') */
export const requiereRol = (...roles: Rol[]) => (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.usuario || !roles.includes(req.usuario.rol)) throw prohibido();
  next();
};

/**
 * Mientras el usuario tenga una contraseña temporal, solo puede cambiarla.
 * Se aplica a todas las rutas protegidas excepto las de /auth.
 */
export function requierePasswordDefinitiva(req: Request, _res: Response, next: NextFunction): void {
  if (req.usuario?.debeCambiarPassword) {
    throw prohibido('Debes cambiar tu contraseña temporal antes de continuar.');
  }
  next();
}
