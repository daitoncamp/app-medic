// ==================== CONSULTA ODONTOLÓGICA (API) ====================

import { api, type ErrorApi } from './api';
import { fechaLocalISO } from './clinica';
import { adaptarAlerta, adaptarSignos, ordenarPorSeveridad } from './enfermeriaApi';
import { adaptarCita, adaptarDiagnostico, adaptarReceta } from './recepcionApi';
import type {
  AgendaApi, Cara, CitaApi, ConsentimientoApi, ConsultaApi, DiagnosticoApi, EstadoProcedimientoApi, Medicamento,
  OdontogramaApi, RecetaApi,
} from '../types/api';
import type { Cita, Diagnostico, EstadoPieza, Odontograma, Receta } from '../types/dominio';

export const ESTADOS_PROCEDIMIENTO: { id: EstadoProcedimientoApi; label: string }[] = [
  { id: 'COMPLETADO', label: 'Completado' },
  { id: 'EN_PROCESO', label: 'En proceso (continúa en otra cita)' },
  { id: 'PENDIENTE', label: 'Pendiente (planificado)' },
];

/**
 * Odontograma de la API ({ 16: { completa: 'CARIES', caras: { OCLUSAL: 'TRATADO' } } })
 * → pantalla (estados en minúscula; las caras conservan su nombre de la API)
 */
export const odontogramaPantalla = (mapa: OdontogramaApi = {}): Odontograma => Object.fromEntries(
  Object.entries(mapa).map(([pieza, m]) => [pieza, {
    completa: m.completa ? m.completa.toLowerCase() as EstadoPieza : null,
    caras: Object.fromEntries(Object.entries(m.caras || {}).map(([cara, e]) => [cara, e.toLowerCase() as EstadoPieza])),
  }]),
);

export interface OdontogramaConsulta {
  /** Estado de las visitas anteriores */
  anterior: Odontograma;
  /** Marcas hechas en esta consulta */
  actual: Odontograma;
}

const adaptarOdontograma = ({ anterior, actual }: ConsultaApi['odontograma']): OdontogramaConsulta => ({
  anterior: odontogramaPantalla(anterior),
  actual: odontogramaPantalla(actual),
});

const sinRepetir = (lista: string[]): string[] => [...new Set(lista.map((t) => t.trim()).filter(Boolean))];

/** Texto de alergias para la cabecera y los PDF: "Ninguna" o la lista sin repetir */
const textoAlergias = (lista: string[]): string => {
  const unicas = sinRepetir(lista);
  return unicas.length ? unicas.join('; ') : 'Ninguna';
};

// ==================== AGENDA ====================

export async function obtenerAgenda() {
  const { agenda, metricas } = await api<AgendaApi>('/consultas/agenda');
  return {
    agenda: agenda.map((c) => {
      const cita = adaptarCita(c);
      const alertas = ordenarPorSeveridad(c.alertas.map((a) => adaptarAlerta({ ...a, paciente: cita.paciente })));
      return {
        id: c.id,
        hora: c.hora,
        fecha: c.fecha,
        // Pasó por enfermería otro día y quedó sin finalizar
        deOtroDia: c.fecha !== fechaLocalISO(),
        nombre: cita.paciente,
        cedula: cita.cedula,
        edad: cita.edad,
        sexo: cita.datosPaciente?.sexo,
        tratamiento: c.tipoConsulta,
        preparadaEn: c.preparadaEn,
        signosVitales: adaptarSignos(c.signosVitales),
        alertas,
        alergias: textoAlergias([...c.alergias, ...alertas.filter((a) => a.tipo === 'alergia').map((a) => a.descripcion)]),
      };
    }),
    metricas: {
      ...metricas,
      procedimientosMes: metricas.procedimientosMes.map((p) => ({ label: p.procedimiento, value: p.total })),
    },
  };
}

// ==================== DETALLE ====================

export type Agenda = Awaited<ReturnType<typeof obtenerAgenda>>;
export type PacienteEnAgenda = Agenda['agenda'][number];

export async function obtenerConsulta(citaId: string) {
  const d = await api<ConsultaApi>(`/consultas/${citaId}`);
  const cita = adaptarCita(d.cita);
  const alertas = ordenarPorSeveridad(d.alertas.map((a) => adaptarAlerta({ ...a, paciente: cita.paciente })));
  const listaAlergias = sinRepetir([
    ...d.antecedentes.filter((a) => a.tipo === 'ALERGIA').map((a) => a.descripcion),
    ...alertas.filter((a) => a.tipo === 'alergia').map((a) => a.descripcion),
  ]);
  const alergias = textoAlergias(listaAlergias);
  const signos = adaptarSignos(d.signosVitales);
  const historial = d.historial.map(adaptarDiagnostico);

  return {
    citaId: d.cita.id,
    estado: d.cita.estado,
    // Forma que usan la cabecera y los PDF
    paciente: {
      id: d.cita.id,
      // La consulta siempre trae al paciente
      nombre: cita.paciente ?? '',
      cedula: cita.cedula ?? '',
      edad: cita.edad,
      sexo: cita.datosPaciente?.sexo,
      fechaNacimiento: cita.datosPaciente?.fechaNacimiento,
      hora: cita.hora,
      tratamiento: cita.consulta,
      alergias,
      alergiasLista: listaAlergias,
      signosVitales: signos && { ...signos, hallazgos: alertas.filter((a) => a.tipo === 'signos' && a.citaId === d.cita.id) },
      alertas,
    },
    antecedentes: d.antecedentes,
    historial,
    deEstaConsulta: historial.filter((h) => h.citaId === d.cita.id),
    odontograma: adaptarOdontograma(d.odontograma),
    recetas: d.recetas.filter((r) => !r.anuladaEn).map((r) => adaptarReceta(r)),
    consentimientos: d.consentimientos,
  };
}

// ==================== REGISTROS ====================

/** Convierte los errores de la API a los nombres de campo del formulario */
export type Consulta = Awaited<ReturnType<typeof obtenerConsulta>>;
export type PacienteEnConsulta = Consulta['paciente'];

const conCampos = (error: ErrorApi, mapa: Record<string, string>): ErrorApi => {
  if (error.detalles) {
    error.detalles = Object.fromEntries(Object.entries(error.detalles).map(([k, v]) => [mapa[k] || k, v]));
  }
  return error;
};

export interface NuevoDiagnostico {
  diagnostico: string;
  /** Piezas separadas por coma ("16, 26") */
  diente: string;
  procedimiento: string;
  notas?: string;
  estado: EstadoProcedimientoApi;
}

export async function registrarDiagnostico(
  citaId: string,
  { diagnostico, diente, procedimiento, notas, estado }: NuevoDiagnostico,
): Promise<Diagnostico> {
  try {
    const r = await api<{ diagnostico: DiagnosticoApi }>(`/consultas/${citaId}/diagnosticos`, {
      method: 'POST',
      body: { piezas: diente, procedimiento, descripcion: diagnostico, notas, estado },
    });
    return adaptarDiagnostico(r.diagnostico);
  } catch (e) {
    throw conCampos(e as ErrorApi, { piezas: 'diente', descripcion: 'diagnostico' });
  }
}

/**
 * estado: 'caries' | … ; cara: 'COMPLETA' (por defecto) u 'OCLUSAL', 'MESIAL'…
 * estado null quita las marcas de esa pieza hechas en esta consulta.
 */
type RespuestaOdontograma = { odontograma: ConsultaApi['odontograma'] };

export async function marcarPieza(
  citaId: string,
  pieza: number | string,
  estado: EstadoPieza | null,
  cara: Cara | 'COMPLETA' = 'COMPLETA',
): Promise<OdontogramaConsulta> {
  const ruta = `/consultas/${citaId}/odontograma/${pieza}`;
  const r = estado
    ? await api<RespuestaOdontograma>(ruta, { method: 'PUT', body: { estado: estado.toUpperCase(), cara } })
    : await api<RespuestaOdontograma>(ruta, { method: 'DELETE' });
  return adaptarOdontograma(r.odontograma);
}

export async function deshacerMarcasDeHoy(citaId: string): Promise<OdontogramaConsulta> {
  const r = await api<RespuestaOdontograma>(`/consultas/${citaId}/odontograma`, { method: 'DELETE' });
  return adaptarOdontograma(r.odontograma);
}

/** { medicamentos: [{ medicamento, dosis, frecuencia, duracion }], indicaciones, confirmarAlergias } */
export interface NuevaReceta {
  medicamentos: Medicamento[];
  indicaciones?: string;
  confirmarAlergias?: boolean;
}

export async function emitirReceta(citaId: string, receta: NuevaReceta): Promise<Receta> {
  const r = await api<{ receta: RecetaApi }>(`/consultas/${citaId}/recetas`, { method: 'POST', body: receta });
  return adaptarReceta(r.receta);
}

export async function finalizarConsulta(citaId: string): Promise<Cita> {
  return adaptarCita((await api<{ cita: CitaApi }>(`/consultas/${citaId}/finalizar`, { method: 'POST' })).cita);
}

/**
 * { procedimiento, esRepresentante, firmante: { nombre, cedula, parentesco }, aceptado: true }
 * Los errores de la API llegan con claves "firmante.nombre", etc.
 */
export interface NuevoConsentimiento {
  procedimiento: string;
  esRepresentante: boolean;
  firmante?: { nombre: string; cedula: string; parentesco: string };
  aceptado: true;
}

export async function registrarConsentimiento(citaId: string, datos: NuevoConsentimiento): Promise<ConsentimientoApi> {
  const r = await api<{ consentimiento: ConsentimientoApi }>(`/consultas/${citaId}/consentimientos`, { method: 'POST', body: datos });
  return r.consentimiento;
}
