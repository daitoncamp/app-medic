// ==================== CITAS ====================
//   GET  /api/citas?fecha=AAAA-MM-DD | desde&hasta | todas=1, &estado=, &buscar=
//   POST /api/citas                    agendar { paciente, fecha, hora, tipoConsulta, confirmar }
//   POST /api/citas/sin-cita           paciente que llega sin cita: pasa directo a la sala de espera
//   PATCH /api/citas/:id               editar fecha, hora, tipo y datos del paciente
//   POST /api/citas/:id/confirmar      confirma y envía a la sala de espera
//   POST /api/citas/:id/no-asistio
//   POST /api/citas/:id/anular         { motivo } (las citas no se borran)
//
// Recepción y administración agendan y modifican; todos los roles pueden consultar.

import { Router } from 'express';
import { z } from 'zod';
import { auditar } from '../lib/auditoria.js';
import { conflicto, noEncontrado, solicitudInvalida } from '../lib/errores.js';
import { esquemaFecha, esquemaHora, esquemaPaciente, TIPOS_CONSULTA } from '../lib/esquemas.js';
import { aInstante, fechaLocal, hoyLocal, horaLocal, rangoDia } from '../lib/fechas.js';
import { prisma } from '../lib/prisma.js';
import { citaPublica } from '../lib/serializar.js';
import { validar } from '../lib/validar.js';
import { requiereRol } from '../middlewares/auth.js';
import { filtroBusqueda, guardarPaciente } from './pacientes.js';

export const rutasCitas = Router();
const puedeAgendar = requiereRol('RECEPCIONISTA', 'ADMIN');

const DURACION_MIN = 30;
const incluirPaciente = { paciente: true };

// ==================== CONSULTAR ====================

rutasCitas.get('/', async (req, res) => {
  const q = validar(z.object({
    fecha: esquemaFecha.optional(),
    desde: esquemaFecha.optional(),
    hasta: esquemaFecha.optional(),
    todas: z.enum(['1']).optional(),
    estado: z.enum(['PENDIENTE', 'CONFIRMADA', 'PREPARADA', 'ATENDIDA', 'NO_ASISTIO', 'ANULADA']).optional(),
    buscar: z.string().trim().max(80).optional(),
  }), req.query);

  const where = {};
  if (!q.todas) {
    if (q.desde || q.hasta) {
      where.inicio = {
        ...(q.desde ? { gte: rangoDia(q.desde).desde } : {}),
        ...(q.hasta ? { lt: rangoDia(q.hasta).hasta } : {}),
      };
    } else {
      const { desde, hasta } = rangoDia(q.fecha || hoyLocal());
      where.inicio = { gte: desde, lt: hasta };
    }
  }
  if (q.estado) where.estado = q.estado;
  if (q.buscar) where.paciente = filtroBusqueda(q.buscar);

  const citas = await prisma.cita.findMany({
    where,
    include: incluirPaciente,
    orderBy: { inicio: q.todas ? 'desc' : 'asc' },
    take: 500,
  });
  res.json({ citas: citas.map(citaPublica) });
});

// ==================== AGENDAR ====================

/** Lanza 409 si otra cita activa se cruza con el horario pedido */
async function verificarHorario(inicio, duracionMin, ignorarId) {
  const fin = new Date(inicio.getTime() + duracionMin * 60000);
  const { desde, hasta } = rangoDia(fechaLocal(inicio));
  const delDia = await prisma.cita.findMany({
    where: { inicio: { gte: desde, lt: hasta }, estado: { in: ['PENDIENTE', 'CONFIRMADA'] }, id: ignorarId ? { not: ignorarId } : undefined },
    include: incluirPaciente,
  });
  const choque = delDia.find((c) => c.inicio < fin && new Date(c.inicio.getTime() + c.duracionMin * 60000) > inicio);
  if (choque) {
    throw conflicto(`Ya hay una cita a las ${horaLocal(choque.inicio)} (${choque.paciente.nombres} ${choque.paciente.apellidos}). Elige otro horario.`);
  }
}

const esquemaNuevaCita = z.object({
  paciente: esquemaPaciente,
  fecha: esquemaFecha,
  hora: esquemaHora,
  tipoConsulta: z.enum(TIPOS_CONSULTA, { errorMap: () => ({ message: 'Seleccione el tipo de consulta.' }) }),
  confirmar: z.boolean().optional().default(false),
});

rutasCitas.post('/', puedeAgendar, async (req, res) => {
  const d = validar(esquemaNuevaCita, req.body);
  if (d.fecha < hoyLocal()) {
    throw solicitudInvalida('Revisa los datos enviados.', { fecha: 'La fecha no puede ser anterior a hoy.' });
  }
  const inicio = aInstante(d.fecha, d.hora);
  await verificarHorario(inicio, DURACION_MIN);

  const ahora = new Date();
  const cita = await prisma.$transaction(async (tx) => {
    const paciente = await guardarPaciente(tx, d.paciente);
    return tx.cita.create({
      data: {
        pacienteId: paciente.id,
        inicio,
        duracionMin: DURACION_MIN,
        tipoConsulta: d.tipoConsulta,
        estado: d.confirmar ? 'CONFIRMADA' : 'PENDIENTE',
        confirmadaEn: d.confirmar ? ahora : null,
        llegadaEn: d.confirmar ? ahora : null,
        creadaPorId: req.usuario.id,
      },
      include: incluirPaciente,
    });
  });
  await auditar(req, { accion: 'CREAR', entidad: 'Cita', entidadId: cita.id, detalle: { confirmada: d.confirmar } });
  res.status(201).json({ cita: citaPublica(cita) });
});

rutasCitas.post('/sin-cita', puedeAgendar, async (req, res) => {
  const { paciente: datos } = validar(z.object({ paciente: esquemaPaciente }), req.body);
  const ahora = new Date();
  const cita = await prisma.$transaction(async (tx) => {
    const paciente = await guardarPaciente(tx, datos);
    return tx.cita.create({
      data: {
        pacienteId: paciente.id,
        inicio: ahora,
        duracionMin: DURACION_MIN,
        tipoConsulta: 'Revisión',
        estado: 'CONFIRMADA',
        confirmadaEn: ahora,
        llegadaEn: ahora,
        motivo: 'Paciente sin cita (registro rápido)',
        creadaPorId: req.usuario.id,
      },
      include: incluirPaciente,
    });
  });
  await auditar(req, { accion: 'CREAR', entidad: 'Cita', entidadId: cita.id, detalle: { sinCita: true } });
  res.status(201).json({ cita: citaPublica(cita) });
});

// ==================== MODIFICAR ====================

const buscarCita = async (id) => {
  const cita = await prisma.cita.findUnique({ where: { id }, include: incluirPaciente });
  if (!cita) throw noEncontrado('Cita');
  return cita;
};

const exigirEstado = (cita, permitidos, accion) => {
  if (!permitidos.includes(cita.estado)) {
    throw conflicto(`No se puede ${accion} una cita en estado ${cita.estado.toLowerCase().replace('_', ' ')}.`);
  }
};

const esquemaEditar = z.object({
  paciente: esquemaPaciente,
  fecha: esquemaFecha,
  hora: esquemaHora,
  tipoConsulta: z.enum(TIPOS_CONSULTA, { errorMap: () => ({ message: 'Seleccione el tipo de consulta.' }) }),
});

rutasCitas.patch('/:id', puedeAgendar, async (req, res) => {
  const d = validar(esquemaEditar, req.body);
  const actual = await buscarCita(req.params.id);
  exigirEstado(actual, ['PENDIENTE', 'CONFIRMADA'], 'editar');

  const inicio = aInstante(d.fecha, d.hora);
  if (inicio.getTime() !== actual.inicio.getTime()) await verificarHorario(inicio, actual.duracionMin, actual.id);

  const cita = await prisma.$transaction(async (tx) => {
    const paciente = await guardarPaciente(tx, d.paciente);
    return tx.cita.update({
      where: { id: actual.id },
      data: { pacienteId: paciente.id, inicio, tipoConsulta: d.tipoConsulta },
      include: incluirPaciente,
    });
  });
  await auditar(req, { accion: 'ACTUALIZAR', entidad: 'Cita', entidadId: cita.id });
  res.json({ cita: citaPublica(cita) });
});

rutasCitas.post('/:id/confirmar', puedeAgendar, async (req, res) => {
  const actual = await buscarCita(req.params.id);
  exigirEstado(actual, ['PENDIENTE'], 'confirmar');
  const ahora = new Date();
  const cita = await prisma.cita.update({
    where: { id: actual.id },
    data: { estado: 'CONFIRMADA', confirmadaEn: ahora, llegadaEn: ahora },
    include: incluirPaciente,
  });
  await auditar(req, { accion: 'ACTUALIZAR', entidad: 'Cita', entidadId: cita.id, detalle: { estado: 'CONFIRMADA' } });
  res.json({ cita: citaPublica(cita) });
});

rutasCitas.post('/:id/no-asistio', puedeAgendar, async (req, res) => {
  const actual = await buscarCita(req.params.id);
  exigirEstado(actual, ['PENDIENTE', 'CONFIRMADA'], 'marcar como no asistió');
  const cita = await prisma.cita.update({
    where: { id: actual.id },
    data: { estado: 'NO_ASISTIO' },
    include: incluirPaciente,
  });
  await auditar(req, { accion: 'ACTUALIZAR', entidad: 'Cita', entidadId: cita.id, detalle: { estado: 'NO_ASISTIO' } });
  res.json({ cita: citaPublica(cita) });
});

rutasCitas.post('/:id/anular', puedeAgendar, async (req, res) => {
  const { motivo } = validar(z.object({
    motivo: z.string({ required_error: 'Indica el motivo.' }).trim().min(5, 'Describe el motivo (mínimo 5 caracteres).').max(300),
  }), req.body);
  const actual = await buscarCita(req.params.id);
  exigirEstado(actual, ['PENDIENTE', 'CONFIRMADA'], 'anular');
  const cita = await prisma.cita.update({
    where: { id: actual.id },
    data: { estado: 'ANULADA', anuladaEn: new Date(), motivoAnulacion: motivo, anuladaPorId: req.usuario.id },
    include: incluirPaciente,
  });
  await auditar(req, { accion: 'ANULAR', entidad: 'Cita', entidadId: cita.id, detalle: { motivo } });
  res.json({ cita: citaPublica(cita) });
});

