// ==================== PACIENTES Y CITAS (API) ====================
// Traduce entre la API (estados en mayúsculas, nombres y apellidos separados)
// y la forma que usan las pantallas.

import { api } from './api';
import { ESTADOS_CITA } from './clinica';

// ===== Estados de cita =====
const ESTADO_DESDE_API = {
  PENDIENTE: ESTADOS_CITA.PENDIENTE,
  CONFIRMADA: ESTADOS_CITA.CONFIRMADA,
  PREPARADA: ESTADOS_CITA.EN_CONSULTA,
  ATENDIDA: ESTADOS_CITA.ATENDIDA,
  NO_ASISTIO: ESTADOS_CITA.NO_ASISTIO,
  ANULADA: ESTADOS_CITA.ANULADA,
};
const ESTADO_HACIA_API = Object.fromEntries(Object.entries(ESTADO_DESDE_API).map(([a, b]) => [b, a]));

// ===== Sexo =====
const SEXO_DESDE_API = { FEMENINO: 'Femenino', MASCULINO: 'Masculino', OTRO: 'Otro' };
const SEXO_HACIA_API = { Femenino: 'FEMENINO', Masculino: 'MASCULINO', Otro: 'OTRO' };

export const adaptarPaciente = (p) => p && ({
  ...p,
  sexo: SEXO_DESDE_API[p.sexo] || p.sexo,
});

export const adaptarCita = (c) => ({
  id: c.id,
  fecha: c.fecha,
  hora: c.hora,
  consulta: c.tipoConsulta,
  estado: ESTADO_DESDE_API[c.estado] || c.estado,
  motivoAnulacion: c.motivoAnulacion,
  llegadaEn: c.llegadaEn,
  // Campos planos que usan las tablas y métricas
  paciente: c.paciente?.nombre,
  cedula: c.paciente?.cedula,
  telefono: c.paciente?.telefono,
  email: c.paciente?.correo,
  edad: c.paciente?.edad,
  datosPaciente: adaptarPaciente(c.paciente),
});

/** Datos del formulario de paciente → cuerpo que espera la API */
const pacienteHaciaApi = (f) => ({
  cedula: f.cedula.trim(),
  nombres: f.nombres.trim(),
  apellidos: f.apellidos.trim(),
  fechaNacimiento: f.fechaNacimiento,
  sexo: SEXO_HACIA_API[f.sexo],
  telefono: f.telefono.trim(),
  correo: f.correo?.trim() || '',
});

/**
 * Convierte los errores por campo de la API ("paciente.cedula", "tipoConsulta")
 * a los nombres de campo de los formularios ("cedula", "consulta").
 */
export const erroresDeFormulario = (error) => {
  const errores = {};
  Object.entries(error.detalles || {}).forEach(([campo, mensaje]) => {
    const nombre = campo.replace(/^paciente\./, '').replace('tipoConsulta', 'consulta');
    errores[nombre] = mensaje;
  });
  return errores;
};

// ==================== PACIENTES ====================

export async function listarPacientes({ buscar = '', limite } = {}) {
  const params = new URLSearchParams();
  if (buscar.trim()) params.set('buscar', buscar.trim());
  if (limite) params.set('limite', limite);
  const { pacientes, total } = await api(`/pacientes?${params}`);
  return { pacientes: pacientes.map(adaptarPaciente), total };
}

/** Busca un paciente por cédula exacta (para completar formularios) */
export async function buscarPacientePorCedula(cedula) {
  const { pacientes } = await listarPacientes({ buscar: cedula, limite: 5 });
  return pacientes.find((p) => p.cedula === cedula) || null;
}

// ==================== CITAS ====================

/** filtros: { fecha } | { desde, hasta } | { todas: true }, más { estado, buscar } */
export async function listarCitas({ fecha, desde, hasta, todas, estado, buscar } = {}) {
  const params = new URLSearchParams();
  if (todas) params.set('todas', '1');
  else if (desde || hasta) {
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
  } else if (fecha) params.set('fecha', fecha);
  if (estado) params.set('estado', ESTADO_HACIA_API[estado]);
  if (buscar?.trim()) params.set('buscar', buscar.trim());
  const { citas } = await api(`/citas?${params}`);
  return citas.map(adaptarCita);
}

export async function agendarCita(form) {
  const { cita } = await api('/citas', {
    method: 'POST',
    body: {
      paciente: pacienteHaciaApi(form),
      fecha: form.fecha,
      hora: form.hora,
      tipoConsulta: form.consulta,
      confirmar: form.estado === ESTADOS_CITA.CONFIRMADA,
    },
  });
  return adaptarCita(cita);
}

export async function editarCita(id, form) {
  const { cita } = await api(`/citas/${id}`, {
    method: 'PATCH',
    body: { paciente: pacienteHaciaApi(form), fecha: form.fecha, hora: form.hora, tipoConsulta: form.consulta },
  });
  return adaptarCita(cita);
}

export async function registrarSinCita(form) {
  const { cita } = await api('/citas/sin-cita', { method: 'POST', body: { paciente: pacienteHaciaApi(form) } });
  return adaptarCita(cita);
}

const accion = (ruta, body) => async (id) => adaptarCita((await api(`/citas/${id}/${ruta}`, { method: 'POST', body })).cita);
export const confirmarCita = accion('confirmar');
export const marcarNoAsistio = accion('no-asistio');
export const anularCita = (id, motivo) => accion('anular', { motivo })(id);

// ==================== FICHA DEL PACIENTE ====================

const TIPO_ALERTA = { SIGNOS_VITALES: 'signos', ALERGIA: 'alergia', ANTECEDENTE: 'antecedente' };
const ESTADO_PROCEDIMIENTO = { PENDIENTE: 'pendiente', EN_PROCESO: 'proceso', COMPLETADO: 'completado' };
const ORDEN_SEVERIDAD = { critica: 0, alta: 1, moderada: 2 };

export const TEXTO_ANTECEDENTE = {
  ENFERMEDAD: 'Enfermedad',
  MEDICACION: 'Medicación',
  ALERGIA: 'Alergia',
  CIRUGIA: 'Cirugía',
  EMBARAZO: 'Embarazo',
  HABITO: 'Hábito',
  OTRO: 'Otro',
};

const formatoSignos = (s) => s && ({
  presion: `${s.presionSistolica}/${s.presionDiastolica}`,
  pulso: `${s.pulso} lpm`,
  temperatura: `${s.temperatura}°C`,
  observaciones: s.observaciones || 'Ninguna',
});

/**
 * Ficha completa desde la API, con la misma forma que usan la pantalla
 * de ficha y los documentos PDF.
 */
export async function obtenerFicha(cedula) {
  const d = await api(`/pacientes/${cedula}`);
  const paciente = adaptarPaciente(d.paciente);

  const alertas = d.alertas
    .map((a) => ({
      id: a.id,
      citaId: a.citaId,
      tipo: TIPO_ALERTA[a.tipo] || a.tipo,
      signo: a.signo,
      severidad: a.severidad.toLowerCase(),
      titulo: a.titulo,
      descripcion: a.descripcion,
      fecha: a.creadoEn,
      paciente: paciente.nombre,
    }))
    .sort((a, b) => ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad]);

  const citas = d.citas.map((c) => ({ ...adaptarCita({ ...c, paciente: d.paciente }), raw: c }));

  const historial = d.citas.flatMap((c) => c.diagnosticos.map((dx) => ({
    id: dx.id,
    pacienteId: c.id,
    diente: dx.piezas.join(', '),
    procedimiento: dx.procedimiento,
    diagnostico: dx.descripcion,
    notas: dx.notas,
    estado: ESTADO_PROCEDIMIENTO[dx.estado] || dx.estado,
    fechaRegistro: dx.creadoEn,
  }))).sort((a, b) => String(a.fechaRegistro).localeCompare(String(b.fechaRegistro)));

  const recetas = d.citas.flatMap((c) => c.recetas.filter((r) => !r.anuladaEn).map((r) => ({
    id: r.id,
    numero: r.numero,
    citaId: c.id,
    ...(r.medicamentos[0] || {}),
    medicamentos: r.medicamentos,
    indicaciones: r.indicaciones,
    fechaRegistro: r.creadoEn,
  })));

  const conSignos = d.citas.find((c) => c.signosVitales);
  const ultimosSignos = conSignos && {
    ...formatoSignos(conSignos.signosVitales),
    hallazgos: alertas.filter((a) => a.citaId === conSignos.id && a.tipo === 'signos'),
  };

  const odontograma = Object.fromEntries(Object.entries(d.odontograma).map(([pieza, estado]) => [pieza, estado.toLowerCase()]));

  const eventos = [
    ...d.citas.map((c) => ({
      id: `cita-${c.id}`,
      tipo: 'cita',
      fecha: `${c.fecha}T${c.hora}`,
      titulo: `Cita: ${c.tipoConsulta}`,
      detalle: `Estado: ${ESTADO_DESDE_API[c.estado]}${c.motivoAnulacion ? ` (${c.motivoAnulacion})` : ''}`,
    })),
    ...d.citas.filter((c) => c.signosVitales).map((c) => {
      const s = formatoSignos(c.signosVitales);
      return {
        id: `signos-${c.id}`,
        tipo: 'signos',
        fecha: c.signosVitales.creadoEn,
        titulo: 'Signos vitales',
        detalle: `Presión ${s.presion} · Pulso ${s.pulso} · Temp. ${s.temperatura}`,
        notas: c.signosVitales.observaciones,
      };
    }),
    ...historial.map((h) => ({
      id: `dx-${h.id}`,
      tipo: 'diagnostico',
      fecha: h.fechaRegistro,
      titulo: `${h.procedimiento} · pieza ${h.diente}`,
      detalle: h.diagnostico,
      notas: h.notas,
    })),
    ...alertas.map((a) => ({
      id: `alerta-${a.id}`, tipo: 'alerta', fecha: a.fecha, titulo: `Alerta: ${a.titulo}`, detalle: a.descripcion,
    })),
    ...recetas.map((r) => ({
      id: `rx-${r.id}`,
      tipo: 'receta',
      fecha: r.fechaRegistro,
      titulo: `Receta: ${r.medicamentos.map((m) => m.medicamento).join(', ')}`,
      detalle: r.medicamentos.map((m) => `${m.dosis} · ${m.frecuencia} · ${m.duracion}`).join(' / '),
    })),
  ].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

  return {
    paciente,
    antecedentes: d.antecedentes,
    citas,
    eventos,
    alertas,
    recetas: recetas.reverse(),
    historial,
    ultimosSignos,
    odontograma,
  };
}
