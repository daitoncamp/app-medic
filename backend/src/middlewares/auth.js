// ==================== PROTECCIÓN DE RUTAS ====================
import { prisma } from '../lib/prisma.js';
import { noAutorizado, prohibido } from '../lib/errores.js';
import { cerrarSesion, leerSesion } from '../lib/sesion.js';

/**
 * Exige una sesión válida. Consulta al usuario en cada petición para que
 * desactivarlo o cambiarle el rol tenga efecto inmediato.
 * Deja el usuario en req.usuario.
 */
export async function autenticar(req, res, next) {
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

/** Solo deja pasar a los roles indicados: requiereRol('ADMIN', 'RECEPCIONISTA') */
export const requiereRol = (...roles) => (req, res, next) => {
  if (!roles.includes(req.usuario?.rol)) throw prohibido();
  next();
};

/**
 * Mientras el usuario tenga una contraseña temporal, solo puede cambiarla.
 * Se aplica a todas las rutas protegidas excepto las de /auth.
 */
export function requierePasswordDefinitiva(req, res, next) {
  if (req.usuario?.debeCambiarPassword) {
    throw prohibido('Debes cambiar tu contraseña temporal antes de continuar.');
  }
  next();
}
