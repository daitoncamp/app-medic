// ==================== RECORDATORIOS (API) ====================

import { api } from './api';
import { adaptarCita } from './recepcionApi';

const MAYORIA_DE_EDAD = 18;

/** Citas del día (por defecto, mañana) con su último recordatorio enviado */
export async function listarRecordatorios(fecha) {
  const d = await api(`/recordatorios${fecha ? `?fecha=${fecha}` : ''}`);
  return {
    fecha: d.fecha,
    pendientes: d.pendientes,
    citas: d.citas.map((c) => ({ ...adaptarCita(c), recordatorio: c.recordatorio })),
  };
}

export async function marcarRecordatorioEnviado(citaId, canal = 'WHATSAPP') {
  return (await api(`/recordatorios/${citaId}/enviado`, { method: 'POST', body: { canal } })).recordatorio;
}

/** "lunes 23 de noviembre" */
const diaLargo = (fecha) => new Date(`${fecha}T12:00:00`).toLocaleDateString('es-EC', {
  weekday: 'long', day: 'numeric', month: 'long',
});

/**
 * Texto del recordatorio. Si el paciente es menor de edad, el mensaje va
 * dirigido a su representante.
 */
export function mensajeRecordatorio(cita) {
  const menor = Number(cita.edad) < MAYORIA_DE_EDAD;
  const nombre = cita.datosPaciente?.nombres || cita.paciente;
  const saludo = menor
    ? `Hola, le recordamos la cita de ${cita.paciente}`
    : `Hola, ${nombre}. Le recordamos su cita`;
  return `${saludo} de ${cita.consulta.toLowerCase()} en la Clínica Odontológica de la ULEAM `
    + `el ${diaLargo(cita.fecha)} a las ${cita.hora}. `
    + 'Por favor, llegue 10 minutos antes y traiga su cédula. '
    + 'Si no puede asistir, responda este mensaje para reprogramar.';
}

/** Enlace de WhatsApp con el mensaje listo. 0991234567 → 593991234567 */
export function enlaceWhatsApp(telefono, mensaje) {
  const numero = `593${String(telefono).replace(/\D/g, '').replace(/^0/, '')}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
