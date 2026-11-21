// ==================== ENFERMERÍA ====================
//   GET  /api/enfermeria/sala               sala de espera, preparados, alertas y métricas de hoy
//   POST /api/enfermeria/citas/:id/signos   { presion: "120/80", pulso, temperatura,
//                                            frecuenciaRespiratoria?, saturacion?, observaciones }
//
// Los signos se evalúan aquí, en el servidor, con la edad calculada a partir de
// la fecha de nacimiento. Las reglas están en /shared/signosVitales.js, las
// mismas que usa el formulario para mostrar la vista previa.

import { Router } from 'express';
import { z } from 'zod';
import { alertasDeLaToma, leerPresion, validarMedicion } from '../../../shared/signosVitales.js';
import { auditar } from '../lib/auditoria.js';
import { conflicto, noEncontrado, solicitudInvalida } from '../lib/errores.js';
import { calcularEdad, hoyLocal, rangoDia } from '../lib/fechas.js';
import { prisma } from '../lib/prisma.js';
import { citaPublica, nombreCompleto } from '../lib/serializar.js';
import { validar } from '../lib/validar.js';
import { requiereRol } from '../middlewares/auth.js';

export const rutasEnfermeria = Router();

const puedeVer = requiereRol('ENFERMERA', 'ODONTOLOGA', 'ADMIN');
const puedeRegistrar = requiereRol('ENFERMERA', 'ADMIN');

const TIPO_ALERTA = { signos: 'SIGNOS_VITALES', alergia: 'ALERGIA' };

// Antecedentes que enfermería debe ver antes de tomar los signos
const ANTECEDENTES_RELEVANTES = ['ALERGIA', 'ENFERMEDAD', 'MEDICACION', 'EMBARAZO'];

export const signosPublicos = (s) => s && ({
  id: s.id,
  presionSistolica: s.presionSistolica,
  presionDiastolica: s.presionDiastolica,
  pulso: s.pulso,
  temperatura: Number(s.temperatura),
  frecuenciaRespiratoria: s.frecuenciaRespiratoria,
  saturacion: s.saturacionO2,
  observaciones: s.observaciones,
  edadMeses: s.edadMeses,
  creadoEn: s.creadoEn,
  registradoPor: s.registradoPor?.nombre,
});

export const alertaPublica = (a) => ({
  id: a.id,
  citaId: a.citaId,
  tipo: a.tipo,
  signo: a.signo,
  severidad: a.severidad,
  titulo: a.titulo,
  descripcion: a.descripcion,
  creadoEn: a.creadoEn,
  ...(a.paciente ? { paciente: nombreCompleto(a.paciente), cedula: a.paciente.cedula } : {}),
});

const minutosEntre = (a, b) => Math.max(0, Math.round((b - a) / 60000));

// ==================== SALA DE ESPERA ====================

rutasEnfermeria.get('/sala', puedeVer, async (req, res) => {
  const { desde, hasta } = rangoDia(hoyLocal());
  const deHoy = { inicio: { gte: desde, lt: hasta } };

  const [enEspera, preparados, alertas, ultimas] = await Promise.all([
    prisma.cita.findMany({
      where: { ...deHoy, estado: 'CONFIRMADA' },
      include: {
        paciente: {
          include: {
            antecedentes: {
              where: { vigente: true, tipo: { in: ANTECEDENTES_RELEVANTES } },
              orderBy: { creadoEn: 'asc' },
            },
          },
        },
      },
      orderBy: [{ llegadaEn: 'asc' }, { inicio: 'asc' }],
    }),
    prisma.cita.findMany({
      where: { ...deHoy, estado: 'PREPARADA' },
      include: {
        paciente: true,
        signosVitales: { include: { registradoPor: { select: { nombre: true } } } },
        alertas: { orderBy: { creadoEn: 'asc' } },
      },
      orderBy: { preparadaEn: 'asc' },
    }),
    prisma.alertaMedica.findMany({
      where: { creadoEn: { gte: desde, lt: hasta } },
      include: { paciente: true },
      orderBy: { creadoEn: 'desc' },
      take: 100,
    }),
    prisma.signosVitales.findMany({
      include: { cita: { include: { paciente: true } }, registradoPor: { select: { nombre: true } } },
      orderBy: { creadoEn: 'desc' },
      take: 10,
    }),
  ]);

  // Métricas de hoy: cuántos se prepararon y cuánto esperaron desde que llegaron
  const tomadasHoy = await prisma.cita.findMany({
    where: { preparadaEn: { gte: desde, lt: hasta } },
    select: { llegadaEn: true, preparadaEn: true },
  });
  const esperas = tomadasHoy.filter((c) => c.llegadaEn).map((c) => minutosEntre(c.llegadaEn, c.preparadaEn));

  res.json({
    enEspera: enEspera.map((c) => ({
      ...citaPublica(c),
      antecedentes: c.paciente.antecedentes.map((a) => ({ id: a.id, tipo: a.tipo, descripcion: a.descripcion })),
    })),
    preparados: preparados.map((c) => ({
      ...citaPublica(c),
      signosVitales: signosPublicos(c.signosVitales),
      alertas: c.alertas.map(alertaPublica),
    })),
    alertasHoy: alertas.map(alertaPublica),
    ultimasAtenciones: ultimas.map((s) => ({
      ...signosPublicos(s),
      paciente: nombreCompleto(s.cita.paciente),
      cedula: s.cita.paciente.cedula,
      tipoConsulta: s.cita.tipoConsulta,
    })),
    metricas: {
      enEspera: enEspera.length,
      preparadosHoy: tomadasHoy.length,
      esperaPromedioMin: esperas.length ? Math.round(esperas.reduce((s, v) => s + v, 0) / esperas.length) : null,
    },
  });
});

// ==================== REGISTRAR SIGNOS VITALES ====================

const esquemaSignos = z.object({
  presion: z.string().trim().max(10),
  pulso: z.union([z.string(), z.number()]).transform(String),
  temperatura: z.union([z.string(), z.number()]).transform(String),
  // Opcionales: no todas las consultas tienen oxímetro
  frecuenciaRespiratoria: z.union([z.string(), z.number(), z.null()]).optional().transform((v) => (v === null || v === undefined ? '' : String(v))),
  saturacion: z.union([z.string(), z.number(), z.null()]).optional().transform((v) => (v === null || v === undefined ? '' : String(v))),
  observaciones: z.string().trim().max(1000).optional().default(''),
});

rutasEnfermeria.post('/citas/:id/signos', puedeRegistrar, async (req, res) => {
  const d = validar(esquemaSignos, req.body);

  // Mismas reglas de digitación que el formulario
  const errores = validarMedicion(d);
  if (Object.keys(errores).length) throw solicitudInvalida('Revisa los signos vitales.', errores);

  const cita = await prisma.cita.findUnique({ where: { id: req.params.id }, include: { paciente: true } });
  if (!cita) throw noEncontrado('Cita');
  if (cita.estado !== 'CONFIRMADA') {
    throw conflicto(cita.estado === 'PREPARADA'
      ? 'Otra persona ya registró los signos vitales de este paciente.'
      : 'El paciente no está en la sala de espera.');
  }

  const { sistolica, diastolica } = leerPresion(d.presion);
  const pulso = Number(d.pulso);
  const temperatura = Number(d.temperatura.replace(',', '.'));
  const edad = calcularEdad(cita.paciente.fechaNacimiento);
  const observaciones = d.observaciones || null;
  const opcional = (v) => (v.trim() ? Number(v) : null);
  const frecuenciaRespiratoria = opcional(d.frecuenciaRespiratoria);
  const saturacion = opcional(d.saturacion);
  const hallazgos = alertasDeLaToma({
    presion: d.presion,
    pulso,
    temperatura,
    frecuenciaRespiratoria,
    saturacion,
    observaciones,
    edad: edad.anios,
    edadMeses: edad.meses,
    sexo: cita.paciente.sexo,
  });

  const resultado = await prisma.$transaction(async (tx) => {
    // Cambia el estado solo si sigue en espera: evita que dos personas registren a la vez
    const { count } = await tx.cita.updateMany({
      where: { id: cita.id, estado: 'CONFIRMADA' },
      data: { estado: 'PREPARADA', preparadaEn: new Date() },
    });
    if (!count) throw conflicto('Otra persona ya registró los signos vitales de este paciente.');

    const signos = await tx.signosVitales.create({
      data: {
        citaId: cita.id,
        presionSistolica: sistolica,
        presionDiastolica: diastolica,
        pulso,
        temperatura,
        frecuenciaRespiratoria,
        saturacionO2: saturacion,
        observaciones,
        edadMeses: edad.meses,
        registradoPorId: req.usuario.id,
      },
    });

    const alertas = [];
    for (const h of hallazgos) {
      alertas.push(await tx.alertaMedica.create({
        data: {
          pacienteId: cita.pacienteId,
          citaId: cita.id,
          signosVitalesId: signos.id,
          tipo: TIPO_ALERTA[h.tipo],
          signo: h.signo,
          severidad: h.severidad.toUpperCase(),
          titulo: h.titulo,
          descripcion: h.descripcion,
        },
      }));
    }

    const actualizada = await tx.cita.findUnique({ where: { id: cita.id }, include: { paciente: true } });
    return { cita: actualizada, signos, alertas };
  });

  await auditar(req, {
    accion: 'CREAR',
    entidad: 'SignosVitales',
    entidadId: resultado.signos.id,
    detalle: { citaId: cita.id, alertas: resultado.alertas.map((a) => a.titulo) },
  });

  res.status(201).json({
    cita: citaPublica(resultado.cita),
    signosVitales: signosPublicos(resultado.signos),
    alertas: resultado.alertas.map(alertaPublica),
  });
});
