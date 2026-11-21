// ==================== CONSULTA ODONTOLÓGICA (API) ====================

import { api } from './api';
import { adaptarAlerta, adaptarSignos, ordenarPorSeveridad } from './enfermeriaApi';
import { adaptarCita, adaptarDiagnostico, adaptarReceta } from './recepcionApi';

export const PROCEDIMIENTOS = ['Limpieza', 'Extracción', 'Resina', 'Corona', 'Endodoncia', 'Ortodoncia', 'Revisión'];

export const ESTADOS_PROCEDIMIENTO = [
  { id: 'COMPLETADO', label: 'Completado' },
  { id: 'EN_PROCESO', label: 'En proceso (continúa en otra cita)' },
  { id: 'PENDIENTE', label: 'Pendiente (planificado)' },
];

/**
 * Odontograma de la API ({ 16: { completa: 'CARIES', caras: { OCLUSAL: 'TRATADO' } } })
 * → pantalla (estados en minúscula; las caras conservan su nombre de la API)
 */
export const odontogramaPantalla = (mapa = {}) => Object.fromEntries(Object.entries(mapa).map(([pieza, m]) => [pieza, {
  completa: m.completa ? m.completa.toLowerCase() : null,
  caras: Object.fromEntries(Object.entries(m.caras || {}).map(([cara, e]) => [cara, e.toLowerCase()])),
}]));

const adaptarOdontograma = ({ anterior, actual }) => ({
  anterior: odontogramaPantalla(anterior),
  actual: odontogramaPantalla(actual),
});

const sinRepetir = (lista) => [...new Set(lista.map((t) => t.trim()).filter(Boolean))];

/** Texto de alergias para la cabecera y los PDF: "Ninguna" o la lista sin repetir */
const textoAlergias = (lista) => {
  const unicas = sinRepetir(lista);
  return unicas.length ? unicas.join('; ') : 'Ninguna';
};

// ==================== AGENDA ====================

export async function obtenerAgenda() {
  const { agenda, metricas } = await api('/consultas/agenda');
  return {
    agenda: agenda.map((c) => {
      const cita = adaptarCita(c);
      const alertas = ordenarPorSeveridad(c.alertas.map((a) => adaptarAlerta({ ...a, paciente: cita.paciente })));
      return {
        id: c.id,
        hora: c.hora,
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

export async function obtenerConsulta(citaId) {
  const d = await api(`/consultas/${citaId}`);
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
      nombre: cita.paciente,
      cedula: cita.cedula,
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
const conCampos = (error, mapa) => {
  if (error.detalles) {
    error.detalles = Object.fromEntries(Object.entries(error.detalles).map(([k, v]) => [mapa[k] || k, v]));
  }
  return error;
};

export async function registrarDiagnostico(citaId, { diagnostico, diente, procedimiento, notas, estado }) {
  try {
    const r = await api(`/consultas/${citaId}/diagnosticos`, {
      method: 'POST',
      body: { piezas: diente, procedimiento, descripcion: diagnostico, notas, estado },
    });
    return adaptarDiagnostico(r.diagnostico);
  } catch (e) {
    throw conCampos(e, { piezas: 'diente', descripcion: 'diagnostico' });
  }
}

/**
 * estado: 'caries' | … ; cara: 'COMPLETA' (por defecto) u 'OCLUSAL', 'MESIAL'…
 * estado null quita las marcas de esa pieza hechas en esta consulta.
 */
export async function marcarPieza(citaId, pieza, estado, cara = 'COMPLETA') {
  const ruta = `/consultas/${citaId}/odontograma/${pieza}`;
  const r = estado
    ? await api(ruta, { method: 'PUT', body: { estado: estado.toUpperCase(), cara } })
    : await api(ruta, { method: 'DELETE' });
  return adaptarOdontograma(r.odontograma);
}

export async function deshacerMarcasDeHoy(citaId) {
  const r = await api(`/consultas/${citaId}/odontograma`, { method: 'DELETE' });
  return adaptarOdontograma(r.odontograma);
}

/** { medicamentos: [{ medicamento, dosis, frecuencia, duracion }], indicaciones, confirmarAlergias } */
export async function emitirReceta(citaId, receta) {
  const r = await api(`/consultas/${citaId}/recetas`, { method: 'POST', body: receta });
  return adaptarReceta(r.receta);
}

export async function finalizarConsulta(citaId) {
  return adaptarCita((await api(`/consultas/${citaId}/finalizar`, { method: 'POST' })).cita);
}

/**
 * { procedimiento, esRepresentante, firmante: { nombre, cedula, parentesco }, aceptado: true }
 * Los errores de la API llegan con claves "firmante.nombre", etc.
 */
export async function registrarConsentimiento(citaId, datos) {
  const r = await api(`/consultas/${citaId}/consentimientos`, { method: 'POST', body: datos });
  return r.consentimiento;
}
