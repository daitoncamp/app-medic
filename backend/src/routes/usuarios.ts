// ==================== USUARIOS (solo administración) ====================
//   GET   /api/usuarios
//   POST  /api/usuarios                          { nombre, email, rol, password }
//   PATCH /api/usuarios/:id                      { activo }
//   POST  /api/usuarios/:id/restablecer-password { password }

import { Router } from 'express';
import { z } from 'zod';
import { auditar } from '../lib/auditoria.ts';
import { conflicto, noEncontrado, solicitudInvalida } from '../lib/errores.ts';
import { esquemaPassword, hashPassword } from '../lib/password.ts';
import { prisma } from '../lib/prisma.ts';
import { usuarioPublico } from '../lib/sesion.ts';
import { parametro, validar } from '../lib/validar.ts';
import { requiereRol, usuarioDe } from '../middlewares/auth.ts';

export const rutasUsuarios = Router();
rutasUsuarios.use(requiereRol('ADMIN'));

const ROLES = ['ADMIN', 'RECEPCIONISTA', 'ENFERMERA', 'ODONTOLOGA'] as const;

rutasUsuarios.get('/', async (req, res) => {
  const usuarios = await prisma.usuario.findMany({ orderBy: [{ activo: 'desc' }, { nombre: 'asc' }] });
  res.json({ usuarios: usuarios.map(usuarioPublico) });
});

const esquemaNuevo = z.object({
  nombre: z.string({ required_error: 'El nombre es obligatorio.' }).trim().min(3, 'Mínimo 3 caracteres.').max(120),
  email: z.string({ required_error: 'El correo es obligatorio.' }).trim().toLowerCase().email('Correo inválido.'),
  rol: z.enum(ROLES, { errorMap: () => ({ message: 'Seleccione un rol válido.' }) }),
  password: esquemaPassword,
});

rutasUsuarios.post('/', async (req, res) => {
  const datos = validar(esquemaNuevo, req.body);
  const existe = await prisma.usuario.findUnique({ where: { email: datos.email } });
  if (existe) throw conflicto('Ya existe un usuario con ese correo.');

  const usuario = await prisma.usuario.create({
    data: {
      nombre: datos.nombre,
      email: datos.email,
      rol: datos.rol,
      passwordHash: await hashPassword(datos.password),
      debeCambiarPassword: true, // la contraseña la puso el administrador: es temporal
    },
  });
  await auditar(req, { accion: 'CREAR', entidad: 'Usuario', entidadId: usuario.id, detalle: { email: usuario.email, rol: usuario.rol } });
  res.status(201).json({ usuario: usuarioPublico(usuario) });
});

const esquemaEstado = z.object({ activo: z.boolean({ required_error: 'Indique si el usuario queda activo.' }) });

rutasUsuarios.patch('/:id', async (req, res) => {
  const { activo } = validar(esquemaEstado, req.body);
  const usuario = await prisma.usuario.findUnique({ where: { id: parametro(req.params.id) } });
  if (!usuario) throw noEncontrado('Usuario');

  if (!activo) {
    if (usuario.id === usuarioDe(req).id) throw solicitudInvalida('No puedes desactivar tu propio usuario.');
    if (usuario.rol === 'ADMIN') {
      const adminsActivos = await prisma.usuario.count({ where: { rol: 'ADMIN', activo: true } });
      if (adminsActivos <= 1) throw solicitudInvalida('Debe quedar al menos un administrador activo.');
    }
  }

  const actualizado = await prisma.usuario.update({ where: { id: usuario.id }, data: { activo } });
  await auditar(req, { accion: 'ACTUALIZAR', entidad: 'Usuario', entidadId: usuario.id, detalle: { activo } });
  res.json({ usuario: usuarioPublico(actualizado) });
});

const esquemaRestablecer = z.object({ password: esquemaPassword });

rutasUsuarios.post('/:id/restablecer-password', async (req, res) => {
  const { password } = validar(esquemaRestablecer, req.body);
  const usuario = await prisma.usuario.findUnique({ where: { id: parametro(req.params.id) } });
  if (!usuario) throw noEncontrado('Usuario');

  const actualizado = await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      passwordHash: await hashPassword(password),
      debeCambiarPassword: true,
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
  });
  await auditar(req, { accion: 'ACTUALIZAR', entidad: 'Usuario', entidadId: usuario.id, detalle: { campo: 'password', restablecida: true } });
  res.json({ usuario: usuarioPublico(actualizado) });
});
