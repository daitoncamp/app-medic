// ==================== PACIENTES Y CITAS (API) ====================
// Traduce entre la API (estados en mayúsculas, nombres y apellidos separados)
// y la forma que usan las pantallas.

import { api, type ErrorApi } from './api';
import { ESTADOS_CITA } from './clinica';
import { normalizarProcedimiento } from '../utils/procedimientos';
import type {
  AlertaApi, CitaApi, DiagnosticoApi, EstadoCitaApi, EstadoProcedimientoApi, FichaApi, PacienteApi,
  RecetaApi, SexoApi, SignosApi, TipoAlertaApi, TipoAntecedente,
} from '../types/api';
import type {
  Alerta, Antecedente, Cita, Diagnostico, Errores, EstadoCita, EstadoPieza, EventoFicha, FormularioCita,
  FormularioPaciente, Odontograma, Paciente, PacienteListado, Receta, Severidad, Signos, TipoAlerta,
} from '../types/dominio';

// ===== Estados de cita =====
const ESTADO_DESDE_API: Record<EstadoCitaApi, EstadoCita> = {
  PENDIENTE: ESTADOS_CITA.PENDIENTE,
  CONFIRMADA: ESTADOS_CITA.CONFIRMADA,
  PREPARADA: ESTADOS_CITA.EN_CONSULTA,
  ATENDIDA: ESTADOS_CITA.ATENDIDA,
  NO_ASISTIO: ESTADOS_CITA.NO_ASISTIO,
  ANULADA: ESTADOS_CITA.ANULADA,
};
const ESTADO_HACIA_API = Object.fromEntries(
  Object.entries(ESTADO_DESDE_API).map(([a, b]) => [b, a]),
) as Record<EstadoCita, EstadoCitaApi>;

// ===== Sexo =====
const SEXO_DESDE_API: Record<SexoApi, Paciente['sexo']> = { FEMENINO: 'Femenino', MASCULINO: 'Masculino', OTRO: 'Otro' };
const SEXO_HACIA_API: Record<string, SexoApi> = { Femenino: 'FEMENINO', Masculino: 'MASCULINO', Otro: 'OTRO' };

export function adaptarPaciente(p: PacienteApi): Paciente;
export function adaptarPaciente(p: PacienteApi | undefined): Paciente | undefined;
export function adaptarPaciente(p: PacienteApi | undefined): Paciente | undefined {
  return p && { ...p, sexo: SEXO_DESDE_API[p.sexo] || p.sexo };
}

export const adaptarCita = (c: CitaApi): Cita => ({
  id: c.id,
  fecha: c.fecha,
  hora: c.hora,
  // Los nombres antiguos guardados ("Limpieza dental") se muestran con el actual
  consulta: normalizarProcedimiento(c.tipoConsulta),
  estado: ESTADO_DESDE_API[c.estado],
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
const pacienteHaciaApi = (f: FormularioPaciente) => ({
  cedula: f.cedula.trim(),
  nombres: f.nombres.trim(),
  apellidos: f.apellidos.trim(),
  fechaNacimiento: f.fechaNacimiento,
  sexo: SEXO_HACIA_API[f.sexo],
  telefono: f.telefono.trim(),
  correo: f.correo?.trim() || '',
  contactoEmergenciaNombre: f.contactoEmergenciaNombre?.trim() || '',
  contactoEmergenciaTelefono: f.contactoEmergenciaTelefono?.trim() || '',
});

/**
 * Convierte los errores por campo de la API ("paciente.cedula", "tipoConsulta")
 * a los nombres de campo de los formularios ("cedula", "consulta").
 */
export const erroresDeFormulario = (error: ErrorApi): Errores => {
  const errores: Errores = {};
  Object.entries(error.detalles || {}).forEach(([campo, mensaje]) => {
    const nombre = campo.replace(/^paciente\./, '').replace('tipoConsulta', 'consulta');
    errores[nombre] = mensaje;
  });
  return errores;
};

// ==================== PACIENTES ====================

export async function listarPacientes(
  { buscar = '', limite }: { buscar?: string; limite?: number } = {},
): Promise<{ pacientes: PacienteListado[]; total: number }> {
  const params = new URLSearchParams();
  if (buscar.trim()) params.set('buscar', buscar.trim());
  if (limite) params.set('limite', String(limite));
  const { pacientes, total } = await api<{ pacientes: (PacienteApi & { citas: number; ultimaCita: string | null })[]; total: number }>(
    `/pacientes?${params}`,
  );
  return { pacientes: pacientes.map((p) => ({ ...p, sexo: adaptarPaciente(p).sexo })), total };
}

/** Busca un paciente por cédula exacta (para completar formularios) */
export async function buscarPacientePorCedula(cedula: string): Promise<Paciente | null> {
  const { pacientes } = await listarPacientes({ buscar: cedula, limite: 5 });
  return pacientes.find((p) => p.cedula === cedula) || null;
}

// ==================== CITAS ====================

export interface FiltrosCitas {
  fecha?: string;
  desde?: string;
  hasta?: string;
  todas?: boolean;
  estado?: EstadoCita | '';
  buscar?: string;
}

/** filtros: { fecha } | { desde, hasta } | { todas: true }, más { estado, buscar } */
export async function listarCitas({ fecha, desde, hasta, todas, estado, buscar }: FiltrosCitas = {}): Promise<Cita[]> {
  const params = new URLSearchParams();
  if (todas) params.set('todas', '1');
  else if (desde || hasta) {
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
  } else if (fecha) params.set('fecha', fecha);
  if (estado) params.set('estado', ESTADO_HACIA_API[estado]);
  if (buscar?.trim()) params.set('buscar', buscar.trim());
  const { citas } = await api<{ citas: CitaApi[] }>(`/citas?${params}`);
  return citas.map(adaptarCita);
}

type RespuestaCita = { cita: CitaApi };

export async function agendarCita(form: FormularioCita): Promise<Cita> {
  const { cita } = await api<RespuestaCita>('/citas', {
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

export async function editarCita(id: string, form: FormularioCita): Promise<Cita> {
  const { cita } = await api<RespuestaCita>(`/citas/${id}`, {
    method: 'PATCH',
    body: { paciente: pacienteHaciaApi(form), fecha: form.fecha, hora: form.hora, tipoConsulta: form.consulta },
  });
  return adaptarCita(cita);
}

export async function registrarSinCita(form: FormularioPaciente): Promise<Cita> {
  const { cita } = await api<RespuestaCita>('/citas/sin-cita', { method: 'POST', body: { paciente: pacienteHaciaApi(form) } });
  return adaptarCita(cita);
}

const accion = (ruta: string, body?: unknown) => async (id: string): Promise<Cita> =>
  adaptarCita((await api<RespuestaCita>(`/citas/${id}/${ruta}`, { method: 'POST', body })).cita);
export const confirmarCita = accion('confirmar');
export const marcarNoAsistio = accion('no-asistio');
export const anularCita = (id: string, motivo: string) => accion('anular', { motivo })(id);

// ==================== FICHA DEL PACIENTE ====================

const TIPO_ALERTA: Record<TipoAlertaApi, TipoAlerta> = { SIGNOS_VITALES: 'signos', ALERGIA: 'alergia', ANTECEDENTE: 'antecedente' };
const ESTADO_PROCEDIMIENTO: Record<EstadoProcedimientoApi, Diagnostico['estado']> = {
  PENDIENTE: 'pendiente', EN_PROCESO: 'proceso', COMPLETADO: 'completado',
};
const ORDEN_SEVERIDAD: Record<Severidad, number> = { critica: 0, alta: 1, moderada: 2 };

export const TEXTO_ANTECEDENTE: Record<TipoAntecedente, string> = {
  ENFERMEDAD: 'Enfermedad',
  MEDICACION: 'Medicación',
  ALERGIA: 'Alergia',
  CIRUGIA: 'Cirugía',
  EMBARAZO: 'Embarazo',
  HABITO: 'Hábito',
  OTRO: 'Otro',
};

/** Diagnóstico de la API → fila del historial (pantallas y PDF) */
export const adaptarDiagnostico = (dx: DiagnosticoApi): Diagnostico => ({
  id: dx.id,
  citaId: dx.citaId,
  piezas: dx.piezas,
  diente: dx.piezas.join(', '),
  procedimiento: normalizarProcedimiento(dx.procedimiento),
  diagnostico: dx.descripcion,
  notas: dx.notas,
  estado: ESTADO_PROCEDIMIENTO[dx.estado] || dx.estado,
  fechaRegistro: dx.creadoEn,
  odontologo: dx.odontologo,
});

/** Receta de la API → forma que usan la ficha y el PDF (con el primer medicamento a mano) */
export const adaptarReceta = (r: RecetaApi, citaId: string = r.citaId): Receta => ({
  id: r.id,
  numero: r.numero,
  citaId,
  ...(r.medicamentos[0] || {}),
  medicamentos: r.medicamentos,
  indicaciones: r.indicaciones,
  odontologo: r.odontologo,
  fechaRegistro: r.creadoEn,
});

type SignosBase = Pick<SignosApi,
  'presionSistolica' | 'presionDiastolica' | 'pulso' | 'temperatura' | 'frecuenciaRespiratoria' | 'saturacion' | 'observaciones'>;

const formatoSignos = (s: SignosBase): Signos => ({
  presion: `${s.presionSistolica}/${s.presionDiastolica}`,
  pulso: `${s.pulso} lpm`,
  temperatura: `${s.temperatura}°C`,
  frecuenciaRespiratoria: s.frecuenciaRespiratoria == null ? null : `${s.frecuenciaRespiratoria} rpm`,
  saturacion: s.saturacion == null ? null : `${s.saturacion}%`,
  observaciones: s.observaciones || 'Ninguna',
});

/** "Presión 120/80 · Pulso 72 lpm · Temp. 36.5°C · FR 16 rpm · SpO₂ 98%" */
export const resumenSignos = (s: Signos): string => [
  `Presión ${s.presion}`,
  `Pulso ${s.pulso}`,
  `Temp. ${s.temperatura}`,
  s.frecuenciaRespiratoria && `FR ${s.frecuenciaRespiratoria}`,
  s.saturacion && `SpO₂ ${s.saturacion}`,
].filter(Boolean).join(' · ');

/**
 * Ficha completa desde la API, con la misma forma que usan la pantalla
 * de ficha y los documentos PDF.
 */
export async function obtenerFicha(cedula: string) {
  const d = await api<FichaApi>(`/pacientes/${cedula}`);
  const paciente = adaptarPaciente(d.paciente);

  const alertas: Alerta[] = d.alertas
    .map((a: AlertaApi) => ({
      id: a.id,
      citaId: a.citaId,
      tipo: TIPO_ALERTA[a.tipo] || a.tipo,
      signo: a.signo,
      severidad: a.severidad.toLowerCase() as Severidad,
      titulo: a.titulo,
      descripcion: a.descripcion,
      fecha: a.creadoEn,
      paciente: paciente.nombre,
    }))
    .sort((a, b) => ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad]);

  const citas = d.citas.map((c) => ({ ...adaptarCita({ ...c, paciente: d.paciente }), raw: c }));

  const historial = d.citas.flatMap((c) => c.diagnosticos.map((dx) => adaptarDiagnostico({ ...dx, citaId: c.id })))
    .sort((a, b) => String(a.fechaRegistro).localeCompare(String(b.fechaRegistro)));

  const recetas = d.citas.flatMap((c) => c.recetas.filter((r) => !r.anuladaEn).map((r) => adaptarReceta(r, c.id)));
  const consentimientos = d.citas.flatMap((c) => c.consentimientos || []);

  const conSignos = d.citas.find((c) => c.signosVitales);
  const ultimosSignos: Signos | undefined = conSignos?.signosVitales ? {
    ...formatoSignos(conSignos.signosVitales),
    hallazgos: alertas.filter((a) => a.citaId === conSignos.id && a.tipo === 'signos'),
  } : undefined;

  // { 16: { completa: 'caries', caras: { OCLUSAL: 'tratado' } } }
  const odontograma: Odontograma = Object.fromEntries(Object.entries(d.odontograma).map(([pieza, m]) => [pieza, {
    completa: m.completa ? m.completa.toLowerCase() as EstadoPieza : null,
    caras: Object.fromEntries(Object.entries(m.caras || {}).map(([cara, e]) => [cara, e.toLowerCase() as EstadoPieza])),
  }]));

  const eventos: EventoFicha[] = [
    ...d.citas.map((c) => ({
      id: `cita-${c.id}`,
      tipo: 'cita' as const,
      fecha: `${c.fecha}T${c.hora}`,
      titulo: `Cita: ${normalizarProcedimiento(c.tipoConsulta)}`,
      detalle: `Estado: ${ESTADO_DESDE_API[c.estado]}${c.motivoAnulacion ? ` (${c.motivoAnulacion})` : ''}`,
    })),
    ...d.citas.flatMap((c) => (c.signosVitales ? [{
      id: `signos-${c.id}`,
      tipo: 'signos' as const,
      fecha: c.signosVitales.creadoEn,
      titulo: 'Signos vitales',
      detalle: resumenSignos(formatoSignos(c.signosVitales)),
      notas: c.signosVitales.observaciones,
    }] : [])),
    ...historial.map((h) => ({
      id: `dx-${h.id}`,
      tipo: 'diagnostico' as const,
      fecha: h.fechaRegistro,
      titulo: `${h.procedimiento} · pieza ${h.diente}`,
      detalle: h.diagnostico,
      notas: h.notas,
    })),
    ...alertas.map((a) => ({
      id: `alerta-${a.id}`, tipo: 'alerta' as const, fecha: a.fecha, titulo: `Alerta: ${a.titulo}`, detalle: a.descripcion,
    })),
    ...recetas.map((r) => ({
      id: `rx-${r.id}`,
      tipo: 'receta' as const,
      fecha: r.fechaRegistro,
      titulo: `Receta: ${r.medicamentos.map((m) => m.medicamento).join(', ')}`,
      detalle: r.medicamentos.map((m) => `${m.dosis} · ${m.frecuencia} · ${m.duracion}`).join(' / '),
    })),
    ...consentimientos.map((c) => ({
      id: `consentimiento-${c.id}`,
      tipo: 'consentimiento' as const,
      fecha: c.aceptadoEn,
      titulo: `Consentimiento informado: ${c.procedimiento}`,
      detalle: c.esRepresentante ? `Firmó ${c.firmanteNombre} (representante)` : 'Firmó el paciente',
    })),
  ].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

  return {
    paciente,
    // Los vigentes se usan en pantallas y documentos; los demás quedan como historia
    antecedentes: d.antecedentes.filter((a) => a.vigente !== false),
    antecedentesAnteriores: d.antecedentes.filter((a) => a.vigente === false),
    citas,
    eventos,
    alertas,
    recetas: recetas.reverse(),
    consentimientos: consentimientos.reverse(),
    historial,
    ultimosSignos,
    odontograma,
  };
}

// ==================== ANTECEDENTES ====================

export const TIPOS_ANTECEDENTE = Object.entries(TEXTO_ANTECEDENTE).map(([id, label]) => ({ id, label }));

type RespuestaAntecedente = { antecedente: Antecedente };

export async function registrarAntecedente(
  cedula: string,
  { tipo, descripcion }: { tipo: TipoAntecedente; descripcion: string },
): Promise<Antecedente> {
  const r = await api<RespuestaAntecedente>(`/pacientes/${cedula}/antecedentes`, { method: 'POST', body: { tipo, descripcion } });
  return r.antecedente;
}

/** cambios: { descripcion } o { vigente: false } */
export async function actualizarAntecedente(
  cedula: string,
  id: string,
  cambios: { descripcion?: string; vigente?: boolean },
): Promise<Antecedente> {
  const r = await api<RespuestaAntecedente>(`/pacientes/${cedula}/antecedentes/${id}`, { method: 'PATCH', body: cambios });
  return r.antecedente;
}

// ==================== EDITAR PACIENTE ====================

/** Actualiza los datos del paciente. cedulaActual es la de la URL (puede corregirse). */
export async function actualizarPaciente(cedulaActual: string, form: FormularioPaciente): Promise<Paciente> {
  const r = await api<{ paciente: PacienteApi }>(`/pacientes/${cedulaActual}`, { method: 'PATCH', body: pacienteHaciaApi(form) });
  return adaptarPaciente(r.paciente);
}

export type Ficha = Awaited<ReturnType<typeof obtenerFicha>>;
