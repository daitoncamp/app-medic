// ==================== CONSULTA ODONTOLÓGICA ====================
//   GET    /api/consultas/agenda                         pacientes preparados de hoy y métricas
//   GET    /api/consultas/:citaId                        todo lo necesario para atender
//   POST   /api/consultas/:citaId/diagnosticos           { piezas, procedimiento, descripcion, notas, estado }
//   PUT    /api/consultas/:citaId/odontograma/:pieza     { estado }
//   DELETE /api/consultas/:citaId/odontograma/:pieza     quita la marca hecha en esta consulta
//   DELETE /api/consultas/:citaId/odontograma            quita todas las marcas de esta consulta
//   POST   /api/consultas/:citaId/recetas                { medicamentos: [...], indicaciones }
//   POST   /api/consultas/:citaId/finalizar              la cita queda atendida
//
// El odontograma guarda las marcas de cada visita. Lo que se ve es la marca más
// reciente de cada pieza, así que quitar una marca de hoy no borra la historia:
// la pieza vuelve a mostrar lo que tenía en la visita anterior.

import { Router } from 'express';
import { z } from 'zod';
import { revisarReceta } from '../../../shared/alergias.js';
import { auditar } from '../lib/auditoria.js';
import { conflicto, ErrorApi, noEncontrado } from '../lib/errores.js';
import {
  esquemaPieza, esquemaPiezas, PROCEDIMIENTOS,
} from '../lib/esquemas.js';
import { fechaLocal, hoyLocal, rangoDia } from '../lib/fechas.js';
import { prisma } from '../lib/prisma.js';
import { citaPublica, nombreCompleto, recetaPublica } from '../lib/serializar.js';
import { validar } from '../lib/validar.js';
import { requiereRol } from '../middlewares/auth.js';
import { alertaPublica, signosPublicos } from './enfermeria.js';

export const rutasConsultas = Router();

// Solo quien atiende registra; administración puede consultar
const puedeVer = requiereRol('ODONTOLOGA', 'ADMIN');
const puedeAtender = requiereRol('ODONTOLOGA');

const ESTADOS_DIENTE = ['SANO', 'CARIES', 'TRATADO', 'OBSERVACION', 'AUSENTE'];

// ==================== AYUDAS ====================

const diagnosticoPublico = (d) => ({
  id: d.id,
  citaId: d.citaId,
  piezas: d.piezas,
  procedimiento: d.procedimiento,
  descripcion: d.descripcion,
  notas: d.notas,
  estado: d.estado,
  creadoEn: d.creadoEn,
  odontologo: d.odontologo?.nombre,
});


/** Busca la cita y verifica que se pueda registrar en ella */
async function citaEnConsulta(id, { permitirAtendida = false } = {}) {
  const cita = await prisma.cita.findUnique({ where: { id }, include: { paciente: true } });
  if (!cita) throw noEncontrado('Cita');
  const permitidos = permitirAtendida ? ['PREPARADA', 'ATENDIDA'] : ['PREPARADA'];
  if (!permitidos.includes(cita.estado)) {
    throw conflicto(cita.estado === 'ATENDIDA'
      ? 'Esta consulta ya fue finalizada.'
      : 'El paciente todavía no pasa por enfermería.');
  }
  return cita;
}

/** Odontograma: lo anterior a esta cita y lo marcado en ella, { pieza: estado } */
async function odontogramaDeCita(cita) {
  const marcas = await prisma.marcaOdontograma.findMany({
    where: { pacienteId: cita.pacienteId, cara: 'COMPLETA' },
    include: { cita: { select: { inicio: true } } },
    orderBy: { creadoEn: 'asc' },
  });
  const anterior = {};
  const actual = {};
  marcas
    .filter((m) => m.citaId !== cita.id && m.cita.inicio <= cita.inicio)
    .forEach((m) => { anterior[m.pieza] = m.estado; });
  marcas.filter((m) => m.citaId === cita.id).forEach((m) => { actual[m.pieza] = m.estado; });
  return { anterior, actual };
}

// ==================== AGENDA ====================

rutasConsultas.get('/agenda', puedeVer, async (req, res) => {
  const hoy = hoyLocal();
  const { desde, hasta } = rangoDia(hoy);
  const inicioMes = rangoDia(`${hoy.slice(0, 7)}-01`).desde;

  const [preparados, atendidosHoy, procedimientos] = await Promise.all([
    prisma.cita.findMany({
      where: { inicio: { gte: desde, lt: hasta }, estado: 'PREPARADA' },
      include: {
        paciente: {
          include: { antecedentes: { where: { vigente: true, tipo: 'ALERGIA' } } },
        },
        signosVitales: true,
        alertas: { orderBy: { creadoEn: 'asc' } },
      },
      orderBy: [{ preparadaEn: 'asc' }],
    }),
    prisma.cita.count({ where: { atendidaEn: { gte: desde, lt: hasta } } }),
    prisma.diagnostico.groupBy({
      by: ['procedimiento'],
      where: { creadoEn: { gte: inicioMes } },
      _count: { _all: true },
    }),
  ]);

  res.json({
    agenda: preparados.map((c) => ({
      ...citaPublica(c),
      signosVitales: signosPublicos(c.signosVitales),
      alertas: c.alertas.map(alertaPublica),
      alergias: c.paciente.antecedentes.map((a) => a.descripcion),
    })),
    metricas: {
      preparados: preparados.length,
      atendidosHoy,
      conAlertas: preparados.filter((c) => c.alertas.length).length,
      procedimientosMes: procedimientos
        .map((p) => ({ procedimiento: p.procedimiento, total: p._count._all }))
        .sort((a, b) => b.total - a.total),
    },
  });
});

// ==================== DETALLE DE LA CONSULTA ====================

rutasConsultas.get('/:citaId', puedeVer, async (req, res) => {
  const cita = await prisma.cita.findUnique({
    where: { id: req.params.citaId },
    include: {
      paciente: {
        include: {
          antecedentes: { where: { vigente: true }, orderBy: { creadoEn: 'asc' } },
          alertas: { where: { tipo: 'ALERGIA' }, orderBy: { creadoEn: 'desc' } },
        },
      },
      signosVitales: true,
      alertas: { orderBy: { creadoEn: 'asc' } },
      recetas: {
        include: { medicamentos: { orderBy: { orden: 'asc' } }, odontologo: { select: { nombre: true } } },
        orderBy: { creadoEn: 'desc' },
      },
    },
  });
  if (!cita) throw noEncontrado('Cita');

  // Historial: todos los diagnósticos del paciente, de esta y otras visitas
  const historial = await prisma.diagnostico.findMany({
    where: { cita: { pacienteId: cita.pacienteId } },
    include: { odontologo: { select: { nombre: true } } },
    orderBy: { creadoEn: 'desc' },
  });

  // Alergias registradas en visitas anteriores (las de esta cita ya vienen en `alertas`)
  const alergiasPrevias = cita.paciente.alertas.filter((a) => a.citaId !== cita.id);

  await auditar(req, { accion: 'VER', entidad: 'Consulta', entidadId: cita.id });

  res.json({
    cita: citaPublica(cita),
    antecedentes: cita.paciente.antecedentes.map(({ id, tipo, descripcion }) => ({ id, tipo, descripcion })),
    signosVitales: signosPublicos(cita.signosVitales),
    alertas: [...cita.alertas, ...alergiasPrevias].map(alertaPublica),
    historial: historial.map(diagnosticoPublico),
    odontograma: await odontogramaDeCita(cita),
    recetas: cita.recetas.map(recetaPublica),
  });
});

// ==================== DIAGNÓSTICOS ====================

const esquemaDiagnostico = z.object({
  piezas: esquemaPiezas,
  procedimiento: z.enum(PROCEDIMIENTOS, { errorMap: () => ({ message: 'Elige un procedimiento de la lista.' }) }),
  descripcion: z.string({ required_error: 'El diagnóstico es obligatorio.' }).trim()
    .min(3, 'Describe el diagnóstico (mínimo 3 caracteres).')
    .max(500, 'Máximo 500 caracteres.')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s,.;:()/%°+-]+$/, 'Contiene caracteres no permitidos.'),
  notas: z.string().trim().max(300, 'Máximo 300 caracteres.').optional().transform((v) => v || null),
  estado: z.enum(['COMPLETADO', 'EN_PROCESO', 'PENDIENTE']).default('COMPLETADO'),
});

rutasConsultas.post('/:citaId/diagnosticos', puedeAtender, async (req, res) => {
  const d = validar(esquemaDiagnostico, req.body);
  const cita = await citaEnConsulta(req.params.citaId);

  const diagnostico = await prisma.diagnostico.create({
    data: { ...d, citaId: cita.id, odontologoId: req.usuario.id },
    include: { odontologo: { select: { nombre: true } } },
  });
  await auditar(req, { accion: 'CREAR', entidad: 'Diagnostico', entidadId: diagnostico.id, detalle: { citaId: cita.id } });
  res.status(201).json({ diagnostico: diagnosticoPublico(diagnostico) });
});

// ==================== ODONTOGRAMA ====================

rutasConsultas.put('/:citaId/odontograma/:pieza', puedeAtender, async (req, res) => {
  const { pieza } = validar(z.object({ pieza: esquemaPieza }), req.params);
  const { estado } = validar(z.object({
    estado: z.enum(ESTADOS_DIENTE, { errorMap: () => ({ message: 'Estado de pieza inválido.' }) }),
  }), req.body);
  const cita = await citaEnConsulta(req.params.citaId);

  await prisma.marcaOdontograma.upsert({
    where: { citaId_pieza_cara: { citaId: cita.id, pieza, cara: 'COMPLETA' } },
    update: { estado, registradoPorId: req.usuario.id },
    create: {
      pacienteId: cita.pacienteId, citaId: cita.id, pieza, cara: 'COMPLETA', estado, registradoPorId: req.usuario.id,
    },
  });
  await auditar(req, { accion: 'ACTUALIZAR', entidad: 'Odontograma', entidadId: cita.id, detalle: { pieza, estado } });
  res.json({ odontograma: await odontogramaDeCita(cita) });
});

rutasConsultas.delete('/:citaId/odontograma/:pieza', puedeAtender, async (req, res) => {
  const { pieza } = validar(z.object({ pieza: esquemaPieza }), req.params);
  const cita = await citaEnConsulta(req.params.citaId);
  await prisma.marcaOdontograma.deleteMany({ where: { citaId: cita.id, pieza } });
  await auditar(req, { accion: 'ACTUALIZAR', entidad: 'Odontograma', entidadId: cita.id, detalle: { pieza, estado: null } });
  res.json({ odontograma: await odontogramaDeCita(cita) });
});

rutasConsultas.delete('/:citaId/odontograma', puedeAtender, async (req, res) => {
  const cita = await citaEnConsulta(req.params.citaId);
  const { count } = await prisma.marcaOdontograma.deleteMany({ where: { citaId: cita.id } });
  await auditar(req, { accion: 'ACTUALIZAR', entidad: 'Odontograma', entidadId: cita.id, detalle: { limpiadas: count } });
  res.json({ odontograma: await odontogramaDeCita(cita) });
});

// ==================== RECETAS ====================

const textoReceta = (campo, max = 80) => z.string({ required_error: `${campo} es obligatorio.` }).trim()
  .min(1, `${campo} es obligatorio.`)
  .max(max, `Máximo ${max} caracteres.`)
  // "Cada 6-8 horas" es válido; "-3 días" no
  .refine((v) => !/(^|\s)-\s*\d/.test(v), 'Ingrese un valor correcto (sin números negativos).');

const esquemaReceta = z.object({
  medicamentos: z.array(z.object({
    medicamento: z.string({ required_error: 'El medicamento es obligatorio.' }).trim()
      .min(2, 'El medicamento es obligatorio.')
      .max(80)
      .refine((v) => !/\d/.test(v), 'Escriba solo el nombre (la dosis va aparte).'),
    dosis: textoReceta('La dosis'),
    frecuencia: textoReceta('La frecuencia'),
    duracion: textoReceta('La duración'),
  })).min(1, 'Agrega al menos un medicamento.').max(10, 'Máximo 10 medicamentos por receta.'),
  indicaciones: z.string().trim().max(500, 'Máximo 500 caracteres.').optional().transform((v) => v || null),
  // La odontóloga confirma que revisó una posible alergia y emite igual
  confirmarAlergias: z.boolean().optional().default(false),
});

/** Alergias conocidas del paciente: antecedentes vigentes y alertas de alergia */
async function alergiasDelPaciente(pacienteId) {
  const [antecedentes, alertas] = await Promise.all([
    prisma.antecedente.findMany({ where: { pacienteId, vigente: true, tipo: 'ALERGIA' }, select: { descripcion: true } }),
    prisma.alertaMedica.findMany({ where: { pacienteId, tipo: 'ALERGIA' }, select: { descripcion: true } }),
  ]);
  return [...new Set([...antecedentes, ...alertas].map((a) => a.descripcion))];
}

/** RX-20261121-0001: el número sigue la secuencia del día */
async function siguienteNumero(tx) {
  const dia = fechaLocal(new Date()).replace(/-/g, '');
  const prefijo = `RX-${dia}-`;
  const ultima = await tx.receta.findFirst({
    where: { numero: { startsWith: prefijo } },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  const n = ultima ? Number(ultima.numero.slice(prefijo.length)) + 1 : 1;
  return `${prefijo}${String(n).padStart(4, '0')}`;
}

// También se puede emitir después de finalizar (desde la ficha del paciente)
rutasConsultas.post('/:citaId/recetas', puedeAtender, async (req, res) => {
  const d = validar(esquemaReceta, req.body);
  const cita = await citaEnConsulta(req.params.citaId, { permitirAtendida: true });

  // Posibles alergias: se exige confirmación explícita
  const coincidencias = revisarReceta(d.medicamentos, await alergiasDelPaciente(cita.pacienteId));
  if (coincidencias.length && !d.confirmarAlergias) {
    throw new ErrorApi(409, 'Revisa las alergias del paciente antes de emitir la receta.', Object.fromEntries(
      coincidencias.map((c) => [`medicamentos.${c.indice}.medicamento`, `Posible alergia: "${c.alergia}".`]),
    ));
  }

  // Si dos recetas se emiten al mismo tiempo pueden pedir el mismo número: se reintenta
  let receta;
  for (let intento = 0; !receta; intento += 1) {
    try {
      receta = await prisma.$transaction(async (tx) => tx.receta.create({
        data: {
          numero: await siguienteNumero(tx),
          citaId: cita.id,
          pacienteId: cita.pacienteId,
          odontologoId: req.usuario.id,
          indicaciones: d.indicaciones,
          medicamentos: { create: d.medicamentos.map((m, orden) => ({ ...m, orden })) },
        },
        include: { medicamentos: { orderBy: { orden: 'asc' } }, odontologo: { select: { nombre: true } } },
      }));
    } catch (error) {
      if (error.code !== 'P2002' || intento >= 4) throw error;
    }
  }

  await auditar(req, {
    accion: 'CREAR',
    entidad: 'Receta',
    entidadId: receta.id,
    detalle: {
      numero: receta.numero,
      ...(coincidencias.length ? { alergiasConfirmadas: coincidencias.map((c) => `${c.medicamento}: ${c.alergia}`) } : {}),
    },
  });
  res.status(201).json({
    receta: recetaPublica(receta),
    paciente: { nombre: nombreCompleto(cita.paciente), cedula: cita.paciente.cedula },
  });
});

// ==================== FINALIZAR ====================

rutasConsultas.post('/:citaId/finalizar', puedeAtender, async (req, res) => {
  const cita = await citaEnConsulta(req.params.citaId);
  const { count } = await prisma.cita.updateMany({
    where: { id: cita.id, estado: 'PREPARADA' },
    data: { estado: 'ATENDIDA', atendidaEn: new Date() },
  });
  if (!count) throw conflicto('Esta consulta ya fue finalizada.');
  const actualizada = await prisma.cita.findUnique({ where: { id: cita.id }, include: { paciente: true } });
  await auditar(req, { accion: 'ACTUALIZAR', entidad: 'Cita', entidadId: cita.id, detalle: { estado: 'ATENDIDA' } });
  res.json({ cita: citaPublica(actualizada) });
});
