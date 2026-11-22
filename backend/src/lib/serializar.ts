// ==================== FORMA DE LAS RESPUESTAS ====================
// Convierte los registros de la base de datos en lo que recibe el frontend.

import type {
  Cita, Consentimiento, Paciente, Receta, RecetaMedicamento, Usuario,
} from '@prisma/client';
import { calcularEdad, fechaLocal, horaLocal } from './fechas.ts';

/** Relación opcional con quien registró (solo se usa el nombre) */
type ConAutor = { odontologo?: Pick<Usuario, 'nombre'> | null };

export const nombreCompleto = (p: Pick<Paciente, 'nombres' | 'apellidos'>): string => `${p.nombres} ${p.apellidos}`;

export const pacienteResumen = (p: Paciente) => {
  const edad = calcularEdad(p.fechaNacimiento);
  return {
    id: p.id,
    cedula: p.cedula,
    nombres: p.nombres,
    apellidos: p.apellidos,
    nombre: nombreCompleto(p),
    fechaNacimiento: p.fechaNacimiento.toISOString().slice(0, 10),
    edad: edad.anios,
    edadMeses: edad.meses,
    sexo: p.sexo,
    telefono: p.telefono,
    correo: p.correo,
    contactoEmergenciaNombre: p.contactoEmergenciaNombre,
    contactoEmergenciaTelefono: p.contactoEmergenciaTelefono,
  };
};

export const citaPublica = (c: Cita & { paciente?: Paciente | null }) => ({
  id: c.id,
  fecha: fechaLocal(c.inicio),
  hora: horaLocal(c.inicio),
  inicio: c.inicio,
  duracionMin: c.duracionMin,
  tipoConsulta: c.tipoConsulta,
  estado: c.estado,
  confirmadaEn: c.confirmadaEn,
  llegadaEn: c.llegadaEn,
  preparadaEn: c.preparadaEn,
  atendidaEn: c.atendidaEn,
  anuladaEn: c.anuladaEn,
  motivoAnulacion: c.motivoAnulacion,
  ...(c.paciente ? { paciente: pacienteResumen(c.paciente) } : {}),
});

export const recetaPublica = (r: Receta & ConAutor & { medicamentos: RecetaMedicamento[] }) => ({
  id: r.id,
  numero: r.numero,
  citaId: r.citaId,
  indicaciones: r.indicaciones,
  anuladaEn: r.anuladaEn,
  creadoEn: r.creadoEn,
  odontologo: r.odontologo?.nombre,
  medicamentos: r.medicamentos.map(({ medicamento, dosis, frecuencia, duracion }) => ({
    medicamento, dosis, frecuencia, duracion,
  })),
});

export const consentimientoPublico = (c: Consentimiento & ConAutor) => ({
  id: c.id,
  citaId: c.citaId,
  procedimiento: c.procedimiento,
  textoAceptado: c.textoAceptado,
  firmanteNombre: c.firmanteNombre,
  firmanteCedula: c.firmanteCedula,
  esRepresentante: c.esRepresentante,
  aceptadoEn: c.aceptadoEn,
  odontologo: c.odontologo?.nombre,
});
