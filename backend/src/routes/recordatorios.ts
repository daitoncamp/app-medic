// ==================== RECORDATORIOS DE CITAS ====================
//   GET  /api/recordatorios?fecha=YYYY-MM-DD      citas de ese día (por defecto, mañana) y si ya se avisó
//   POST /api/recordatorios/:citaId/enviado       { canal: 'WHATSAPP' | 'SMS' } registra que se envió
//
// El mensaje lo envía recepción desde su WhatsApp o por SMS desde el celular (la app arma el enlace con el
// texto listo). Aquí solo se registra quién avisó y cuándo, para no repetir.

import { Router } from 'express';
import type { EstadoCita, Recordatorio } from '@prisma/client';
import { z } from 'zod';
import { auditar } from '../lib/auditoria.ts';
import { conflicto, noEncontrado } from '../lib/errores.ts';
import { esquemaFecha } from '../lib/esquemas.ts';
import { hoyLocal, rangoDia, sumarDias } from '../lib/fechas.ts';
import { prisma } from '../lib/prisma.ts';
import { citaPublica } from '../lib/serializar.ts';
import { parametro, validar } from '../lib/validar.ts';
import { requiereRol } from '../middlewares/auth.ts';

export const rutasRecordatorios = Router();

const puedeRecordar = requiereRol('RECEPCIONISTA', 'ADMIN');

// Solo se recuerdan las citas que siguen en pie
const ESTADOS_RECORDABLES: EstadoCita[] = ['PENDIENTE', 'CONFIRMADA'];

const recordatorioPublico = (r: Recordatorio | undefined) => r && ({
  id: r.id,
  canal: r.canal,
  estado: r.estado,
  enviadoEn: r.enviadoEn,
});

rutasRecordatorios.get('/', puedeRecordar, async (req, res) => {
  const { fecha } = validar(z.object({ fecha: esquemaFecha.optional() }), req.query);
  const dia = fecha || sumarDias(hoyLocal(), 1);
  const { desde, hasta } = rangoDia(dia);

  const citas = await prisma.cita.findMany({
    where: { inicio: { gte: desde, lt: hasta }, estado: { in: ESTADOS_RECORDABLES } },
    include: {
      paciente: true,
      recordatorios: { where: { estado: 'ENVIADO' }, orderBy: { enviadoEn: 'desc' }, take: 1 },
    },
    orderBy: { inicio: 'asc' },
  });

  res.json({
    fecha: dia,
    citas: citas.map((c) => ({ ...citaPublica(c), recordatorio: recordatorioPublico(c.recordatorios[0]) })),
    pendientes: citas.filter((c) => !c.recordatorios.length).length,
  });
});

rutasRecordatorios.post('/:citaId/enviado', puedeRecordar, async (req, res) => {
  const { canal } = validar(z.object({ canal: z.enum(['WHATSAPP', 'SMS', 'CORREO']).default('WHATSAPP') }), req.body);
  const cita = await prisma.cita.findUnique({ where: { id: parametro(req.params.citaId) } });
  if (!cita) throw noEncontrado('Cita');
  if (!ESTADOS_RECORDABLES.includes(cita.estado)) throw conflicto('Esta cita ya no está pendiente.');

  const ahora = new Date();
  const recordatorio = await prisma.recordatorio.create({
    data: { citaId: cita.id, canal, programadoPara: ahora, estado: 'ENVIADO', enviadoEn: ahora },
  });
  await auditar(req, { accion: 'CREAR', entidad: 'Recordatorio', entidadId: recordatorio.id, detalle: { citaId: cita.id, canal } });
  res.status(201).json({ recordatorio: recordatorioPublico(recordatorio) });
});
