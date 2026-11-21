// ==================== PACIENTES ====================
//   GET   /api/pacientes?buscar=texto      lista (todos los roles)
//   GET   /api/pacientes/:cedula           ficha completa (todos los roles)
//   POST  /api/pacientes                   crear (recepción, administración)
//   PATCH /api/pacientes/:cedula           editar datos (recepción, administración)

import { Router } from 'express';
import { resumirMarcas } from '../../../shared/odontograma.js';
import { z } from 'zod';
import { auditar } from '../lib/auditoria.js';
import { conflicto, noEncontrado } from '../lib/errores.js';
import { fechaLocal } from '../lib/fechas.js';
import { esquemaPaciente, TIPOS_ANTECEDENTE } from '../lib/esquemas.js';
import { prisma } from '../lib/prisma.js';
import { citaPublica, consentimientoPublico, pacienteResumen, recetaPublica } from '../lib/serializar.js';
import { validar } from '../lib/validar.js';
import { requiereRol } from '../middlewares/auth.js';

export const rutasPacientes = Router();
const puedeEditar = requiereRol('RECEPCIONISTA', 'ADMIN');
// Los antecedentes los puede registrar cualquier persona del equipo clínico
const puedeRegistrarAntecedentes = requiereRol('RECEPCIONISTA', 'ENFERMERA', 'ODONTOLOGA', 'ADMIN');

const antecedentePublico = (a) => ({
  id: a.id,
  tipo: a.tipo,
  descripcion: a.descripcion,
  vigente: a.vigente,
  creadoEn: a.creadoEn,
  actualizadoEn: a.actualizadoEn,
  registradoPor: a.registradoPor?.nombre,
});

/** Minúsculas y sin tildes: "Macías" → "macias" */
export const normalizar = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const datosPaciente = (d) => ({
  textoBusqueda: normalizar(`${d.cedula} ${d.nombres} ${d.apellidos}`),
  cedula: d.cedula,
  nombres: d.nombres,
  apellidos: d.apellidos,
  fechaNacimiento: new Date(`${d.fechaNacimiento}T00:00:00Z`),
  sexo: d.sexo,
  telefono: d.telefono,
  correo: d.correo,
  contactoEmergenciaNombre: d.contactoEmergenciaNombre,
  contactoEmergenciaTelefono: d.contactoEmergenciaTelefono,
});

/** Crea el paciente o actualiza sus datos si la cédula ya existe (lo usan también las citas) */
export const guardarPaciente = (tx, datos) => tx.paciente.upsert({
  where: { cedula: datos.cedula },
  create: datosPaciente(datos),
  update: datosPaciente(datos),
});

/**
 * Filtro de Prisma para buscar pacientes: cada palabra debe aparecer en la
 * cédula, los nombres o los apellidos, sin importar tildes ni mayúsculas.
 */
export const filtroBusqueda = (buscar = '') => {
  const palabras = buscar.split(/\s+/).filter(Boolean);
  if (!palabras.length) return {};
  return {
    AND: palabras.map((p) => ({
      OR: [
        { textoBusqueda: { contains: normalizar(p) } },
        // Pacientes guardados antes de existir textoBusqueda
        { nombres: { contains: p, mode: 'insensitive' } },
        { apellidos: { contains: p, mode: 'insensitive' } },
        { cedula: { startsWith: p } },
      ],
    })),
  };
};

rutasPacientes.get('/', async (req, res) => {
  const { buscar = '', limite = 200 } = validar(z.object({
    buscar: z.string().trim().max(80).optional(),
    limite: z.coerce.number().int().min(1).max(500).optional(),
  }), req.query);

  const where = filtroBusqueda(buscar);

  const [pacientes, total] = await Promise.all([
    prisma.paciente.findMany({
      where,
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
      take: limite,
      include: {
        _count: { select: { citas: true } },
        citas: { orderBy: { inicio: 'desc' }, take: 1, select: { inicio: true } },
      },
    }),
    prisma.paciente.count({ where }),
  ]);

  res.json({
    total,
    pacientes: pacientes.map((p) => ({
      ...pacienteResumen(p),
      citas: p._count.citas,
      ultimaCita: p.citas[0] ? fechaLocal(p.citas[0].inicio) : null,
    })),
  });
});

rutasPacientes.get('/:cedula', async (req, res) => {
  const paciente = await prisma.paciente.findUnique({
    where: { cedula: req.params.cedula },
    include: {
      antecedentes: { include: { registradoPor: { select: { nombre: true } } }, orderBy: { creadoEn: 'asc' } },
      alertas: { orderBy: { creadoEn: 'desc' } },
      marcas: { orderBy: { creadoEn: 'asc' } },
      citas: {
        orderBy: { inicio: 'desc' },
        include: {
          signosVitales: true,
          diagnosticos: { orderBy: { creadoEn: 'asc' } },
          recetas: {
            include: { medicamentos: { orderBy: { orden: 'asc' } }, odontologo: { select: { nombre: true } } },
            orderBy: { creadoEn: 'desc' },
          },
          consentimientos: { include: { odontologo: { select: { nombre: true } } }, orderBy: { aceptadoEn: 'asc' } },
        },
      },
    },
  });
  if (!paciente) throw noEncontrado('Paciente');

  // Odontograma actual: por pieza, el diente completo y sus caras según la marca más reciente
  const odontograma = resumirMarcas(paciente.marcas);

  await auditar(req, { accion: 'VER', entidad: 'Paciente', entidadId: paciente.id });

  res.json({
    paciente: pacienteResumen(paciente),
    // Incluye los que ya no aplican (vigente: false): son parte de la historia
    antecedentes: paciente.antecedentes.map(antecedentePublico),
    alertas: paciente.alertas.map((a) => ({
      id: a.id, citaId: a.citaId, tipo: a.tipo, signo: a.signo, severidad: a.severidad,
      titulo: a.titulo, descripcion: a.descripcion, creadoEn: a.creadoEn,
    })),
    odontograma,
    citas: paciente.citas.map((c) => ({
      ...citaPublica(c),
      signosVitales: c.signosVitales && {
        presionSistolica: c.signosVitales.presionSistolica,
        presionDiastolica: c.signosVitales.presionDiastolica,
        pulso: c.signosVitales.pulso,
        temperatura: Number(c.signosVitales.temperatura),
        frecuenciaRespiratoria: c.signosVitales.frecuenciaRespiratoria,
        saturacion: c.signosVitales.saturacionO2,
        observaciones: c.signosVitales.observaciones,
        creadoEn: c.signosVitales.creadoEn,
      },
      diagnosticos: c.diagnosticos.map((d) => ({
        id: d.id, piezas: d.piezas, procedimiento: d.procedimiento, descripcion: d.descripcion,
        notas: d.notas, estado: d.estado, creadoEn: d.creadoEn,
      })),
      recetas: c.recetas.map(recetaPublica),
      consentimientos: c.consentimientos.map(consentimientoPublico),
    })),
  });
});

rutasPacientes.post('/', puedeEditar, async (req, res) => {
  const datos = validar(esquemaPaciente, req.body);
  const existe = await prisma.paciente.findUnique({ where: { cedula: datos.cedula } });
  if (existe) throw conflicto('Ya existe un paciente con esa cédula.');
  const paciente = await prisma.paciente.create({ data: datosPaciente(datos) });
  await auditar(req, { accion: 'CREAR', entidad: 'Paciente', entidadId: paciente.id });
  res.status(201).json({ paciente: pacienteResumen(paciente) });
});

rutasPacientes.patch('/:cedula', puedeEditar, async (req, res) => {
  const datos = validar(esquemaPaciente, req.body);
  const actual = await prisma.paciente.findUnique({ where: { cedula: req.params.cedula } });
  if (!actual) throw noEncontrado('Paciente');
  if (datos.cedula !== actual.cedula) {
    const otro = await prisma.paciente.findUnique({ where: { cedula: datos.cedula } });
    if (otro) throw conflicto('Ya existe otro paciente con esa cédula.');
  }
  const paciente = await prisma.paciente.update({ where: { id: actual.id }, data: datosPaciente(datos) });
  await auditar(req, { accion: 'ACTUALIZAR', entidad: 'Paciente', entidadId: paciente.id });
  res.json({ paciente: pacienteResumen(paciente) });
});

// ==================== ANTECEDENTES ====================
//   POST  /api/pacientes/:cedula/antecedentes        { tipo, descripcion }
//   PATCH /api/pacientes/:cedula/antecedentes/:id    { descripcion?, vigente? }
// No se borran: cuando ya no aplican se marcan con vigente: false.

const esquemaDescripcionAntecedente = z.string({ required_error: 'La descripción es obligatoria.' }).trim()
  .min(2, 'Describe el antecedente.')
  .max(300, 'Máximo 300 caracteres.');

const esquemaAntecedente = z.object({
  tipo: z.enum(TIPOS_ANTECEDENTE, { errorMap: () => ({ message: 'Elige un tipo de la lista.' }) }),
  descripcion: esquemaDescripcionAntecedente,
});

const esquemaCambioAntecedente = z.object({
  descripcion: esquemaDescripcionAntecedente.optional(),
  vigente: z.boolean().optional(),
}).refine((d) => d.descripcion !== undefined || d.vigente !== undefined, 'No hay cambios.');

async function pacientePorCedula(cedula) {
  const paciente = await prisma.paciente.findUnique({ where: { cedula } });
  if (!paciente) throw noEncontrado('Paciente');
  return paciente;
}

rutasPacientes.post('/:cedula/antecedentes', puedeRegistrarAntecedentes, async (req, res) => {
  const d = validar(esquemaAntecedente, req.body);
  const paciente = await pacientePorCedula(req.params.cedula);

  // Evita duplicar el mismo antecedente vigente
  const repetido = await prisma.antecedente.findFirst({
    where: {
      pacienteId: paciente.id, tipo: d.tipo, vigente: true, descripcion: { equals: d.descripcion, mode: 'insensitive' },
    },
  });
  if (repetido) throw conflicto('Ese antecedente ya está registrado.');

  const antecedente = await prisma.antecedente.create({
    data: { ...d, pacienteId: paciente.id, registradoPorId: req.usuario.id },
    include: { registradoPor: { select: { nombre: true } } },
  });
  await auditar(req, {
    accion: 'CREAR', entidad: 'Antecedente', entidadId: antecedente.id, detalle: { cedula: paciente.cedula, tipo: d.tipo },
  });
  res.status(201).json({ antecedente: antecedentePublico(antecedente) });
});

rutasPacientes.patch('/:cedula/antecedentes/:id', puedeRegistrarAntecedentes, async (req, res) => {
  const d = validar(esquemaCambioAntecedente, req.body);
  const paciente = await pacientePorCedula(req.params.cedula);
  const actual = await prisma.antecedente.findFirst({ where: { id: req.params.id, pacienteId: paciente.id } });
  if (!actual) throw noEncontrado('Antecedente');

  const antecedente = await prisma.antecedente.update({
    where: { id: actual.id },
    data: d,
    include: { registradoPor: { select: { nombre: true } } },
  });
  await auditar(req, {
    accion: 'ACTUALIZAR',
    entidad: 'Antecedente',
    entidadId: antecedente.id,
    detalle: {
      ...(d.descripcion !== undefined ? { antes: actual.descripcion, ahora: d.descripcion } : {}),
      ...(d.vigente !== undefined ? { vigente: d.vigente } : {}),
    },
  });
  res.json({ antecedente: antecedentePublico(antecedente) });
});
