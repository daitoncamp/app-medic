// ==================== ENFERMERÍA (API) ====================

import { api } from './api';
import { adaptarCita, TEXTO_ANTECEDENTE } from './recepcionApi';

const TIPO_ALERTA = { SIGNOS_VITALES: 'signos', ALERGIA: 'alergia', ANTECEDENTE: 'antecedente' };

const ORDEN_SEVERIDAD = { critica: 0, alta: 1, moderada: 2 };

/** De la más a la menos urgente; a igual urgencia, la más reciente primero */
export const ordenarPorSeveridad = (alertas) => [...alertas].sort((a, b) =>
  (ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad]) || String(b.fecha).localeCompare(String(a.fecha)));

/** Alerta de la API → forma que usa <AlertList> */
export const adaptarAlerta = (a) => ({
  id: a.id,
  citaId: a.citaId,
  tipo: TIPO_ALERTA[a.tipo] || a.tipo,
  signo: a.signo,
  severidad: a.severidad.toLowerCase(),
  titulo: a.titulo,
  descripcion: a.descripcion,
  fecha: a.creadoEn,
  paciente: a.paciente,
});

/** Signos de la API → textos para mostrar */
export const adaptarSignos = (s) => s && ({
  presion: `${s.presionSistolica}/${s.presionDiastolica}`,
  pulso: `${s.pulso} lpm`,
  temperatura: `${s.temperatura}°C`,
  observaciones: s.observaciones || 'Ninguna',
  registradoPor: s.registradoPor,
  fecha: s.creadoEn,
});

const adaptarEnSala = (c) => {
  const cita = adaptarCita(c);
  return {
    ...cita,
    sexo: cita.datosPaciente?.sexo,
    antecedentes: (c.antecedentes || []).map((a) => ({ ...a, texto: TEXTO_ANTECEDENTE[a.tipo] || a.tipo })),
    signosVitales: adaptarSignos(c.signosVitales),
    alertas: ordenarPorSeveridad((c.alertas || []).map((a) => adaptarAlerta({ ...a, paciente: cita.paciente }))),
    preparadaEn: c.preparadaEn,
  };
};

/** Sala de espera, preparados, alertas y métricas del día */
export async function obtenerSala() {
  const d = await api('/enfermeria/sala');
  return {
    enEspera: d.enEspera.map(adaptarEnSala),
    preparados: d.preparados.map(adaptarEnSala),
    alertasHoy: ordenarPorSeveridad(d.alertasHoy.map(adaptarAlerta)),
    ultimasAtenciones: d.ultimasAtenciones.map((s) => ({
      id: s.id,
      fecha: s.creadoEn,
      paciente: s.paciente,
      cedula: s.cedula,
      tratamiento: s.tipoConsulta,
      observaciones: s.observaciones || 'Ninguna',
      registradoPor: s.registradoPor,
    })),
    metricas: d.metricas,
  };
}

/**
 * Guarda los signos vitales. El servidor los evalúa según la edad y devuelve
 * las alertas que creó.
 */
export async function registrarSignos(citaId, { presion, pulso, temperatura, observaciones }) {
  const r = await api(`/enfermeria/citas/${citaId}/signos`, {
    method: 'POST',
    body: { presion, pulso, temperatura, observaciones },
  });
  return { cita: adaptarCita(r.cita), alertas: ordenarPorSeveridad(r.alertas.map(adaptarAlerta)) };
}
