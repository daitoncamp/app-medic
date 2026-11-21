// ==================== FORMA DE LAS RESPUESTAS ====================
// Convierte los registros de la base de datos en lo que recibe el frontend.

import { calcularEdad, fechaLocal, horaLocal } from './fechas.js';

export const nombreCompleto = (p) => `${p.nombres} ${p.apellidos}`;

export const pacienteResumen = (p) => {
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

export const citaPublica = (c) => ({
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
