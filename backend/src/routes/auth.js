// ==================== AUTENTICACIÓN ====================
//   POST /api/auth/login             { email, password }
//   POST /api/auth/logout
//   GET  /api/auth/yo                usuario de la sesión actual
//   POST /api/auth/cambiar-password  { actual, nueva }

import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config/env.js';
import { auditar } from '../lib/auditoria.js';
import { ErrorApi, solicitudInvalida } from '../lib/errores.js';
import { compararPassword, esquemaPassword, HASH_FALSO, hashPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { cerrarSesion, crearSesion, usuarioPublico } from '../lib/sesion.js';
import { validar } from '../lib/validar.js';
import { autenticar } from '../middlewares/auth.js';

export const rutasAuth = Router();

const esquemaLogin = z.object({
  email: z.string({ required_error: 'Ingresa tu correo.' }).trim().toLowerCase().email('Correo inválido.'),
  password: z.string({ required_error: 'Ingresa tu contraseña.' }).min(1, 'Ingresa tu contraseña.'),
});

const CREDENCIALES_INCORRECTAS = 'Correo o contraseña incorrectos.';

rutasAuth.post('/login', async (req, res) => {
  const { email, password } = validar(esquemaLogin, req.body);
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Usuario bloqueado por intentos fallidos
  if (usuario?.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
    const minutos = Math.ceil((usuario.bloqueadoHasta - Date.now()) / 60000);
    await auditar(req, { accion: 'LOGIN_FALLIDO', entidad: 'Usuario', entidadId: usuario.id, usuarioId: usuario.id, detalle: { motivo: 'bloqueado' } });
    throw new ErrorApi(429, `Demasiados intentos fallidos. Intenta de nuevo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`);
  }

  // Se compara siempre (aunque el correo no exista) para no revelar qué correos están registrados
  const correcta = await compararPassword(password, usuario?.passwordHash ?? HASH_FALSO);

  if (!usuario || !correcta) {
    if (usuario) {
      const intentos = usuario.intentosFallidos + 1;
      const bloquear = intentos >= config.maxIntentos;
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          intentosFallidos: bloquear ? 0 : intentos,
          bloqueadoHasta: bloquear ? new Date(Date.now() + config.minutosBloqueo * 60000) : null,
        },
      });
      await auditar(req, {
        accion: 'LOGIN_FALLIDO', entidad: 'Usuario', entidadId: usuario.id, usuarioId: usuario.id,
        detalle: { intentos, bloqueado: bloquear },
      });
      if (bloquear) {
        throw new ErrorApi(429, `Demasiados intentos fallidos. Tu usuario quedó bloqueado ${config.minutosBloqueo} minutos.`);
      }
    } else {
      await auditar(req, { accion: 'LOGIN_FALLIDO', entidad: 'Usuario', detalle: { email } });
    }
    throw new ErrorApi(401, CREDENCIALES_INCORRECTAS);
  }

  if (!usuario.activo) {
    await auditar(req, { accion: 'LOGIN_FALLIDO', entidad: 'Usuario', entidadId: usuario.id, usuarioId: usuario.id, detalle: { motivo: 'inactivo' } });
    throw new ErrorApi(403, 'Tu usuario está desactivado. Contacta al administrador.');
  }

  const actualizado = await prisma.usuario.update({
    where: { id: usuario.id },
    data: { intentosFallidos: 0, bloqueadoHasta: null, ultimoAcceso: new Date() },
  });
  crearSesion(res, actualizado);
  await auditar(req, { accion: 'LOGIN', entidad: 'Usuario', entidadId: usuario.id, usuarioId: usuario.id });
  res.json({ usuario: usuarioPublico(actualizado) });
});

rutasAuth.post('/logout', autenticar, async (req, res) => {
  await auditar(req, { accion: 'LOGOUT', entidad: 'Usuario', entidadId: req.usuario.id });
  cerrarSesion(res);
  res.status(204).end();
});

rutasAuth.get('/yo', autenticar, (req, res) => {
  res.json({ usuario: usuarioPublico(req.usuario) });
});

const esquemaCambio = z.object({
  actual: z.string({ required_error: 'Ingresa tu contraseña actual.' }).min(1, 'Ingresa tu contraseña actual.'),
  nueva: esquemaPassword,
});

rutasAuth.post('/cambiar-password', autenticar, async (req, res) => {
  const { actual, nueva } = validar(esquemaCambio, req.body);
  if (!(await compararPassword(actual, req.usuario.passwordHash))) {
    throw solicitudInvalida('Revisa los datos enviados.', { actual: 'La contraseña actual no es correcta.' });
  }
  if (actual === nueva) {
    throw solicitudInvalida('Revisa los datos enviados.', { nueva: 'Debe ser distinta de la actual.' });
  }
  const usuario = await prisma.usuario.update({
    where: { id: req.usuario.id },
    data: { passwordHash: await hashPassword(nueva), debeCambiarPassword: false },
  });
  await auditar(req, { accion: 'ACTUALIZAR', entidad: 'Usuario', entidadId: usuario.id, detalle: { campo: 'password' } });
  // Se renueva la cookie para que la sesión siga activa
  crearSesion(res, usuario);
  res.json({ usuario: usuarioPublico(usuario) });
});
