// ==================== RECORDATORIOS (API) ====================

import { api } from './api';
import { adaptarCita } from './recepcionApi';
import type { CanalRecordatorio, RecordatorioApi, RecordatoriosApi } from '../types/api';
import type { Cita, CitaConRecordatorio } from '../types/dominio';

const MAYORIA_DE_EDAD = 18;

/** Citas del día (por defecto, mañana) con su último recordatorio enviado */
export async function listarRecordatorios(
  fecha?: string,
): Promise<{ fecha: string; pendientes: number; citas: CitaConRecordatorio[] }> {
  const d = await api<RecordatoriosApi>(`/recordatorios${fecha ? `?fecha=${fecha}` : ''}`);
  return {
    fecha: d.fecha,
    pendientes: d.pendientes,
    citas: d.citas.map((c) => ({ ...adaptarCita(c), recordatorio: c.recordatorio })),
  };
}

export async function marcarRecordatorioEnviado(
  citaId: string,
  canal: CanalRecordatorio = 'WHATSAPP',
): Promise<RecordatorioApi> {
  return (await api<{ recordatorio: RecordatorioApi }>(`/recordatorios/${citaId}/enviado`, { method: 'POST', body: { canal } })).recordatorio;
}

/** "lunes 23 de noviembre" */
const diaLargo = (fecha: string): string => new Date(`${fecha}T12:00:00`).toLocaleDateString('es-EC', {
  weekday: 'long', day: 'numeric', month: 'long',
});

/**
 * Texto del recordatorio. Si el paciente es menor de edad, el mensaje va
 * dirigido a su representante.
 */
export function mensajeRecordatorio(cita: Cita): string {
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
export function enlaceWhatsApp(telefono: string, mensaje: string): string {
  const numero = `593${String(telefono).replace(/\D/g, '').replace(/^0/, '')}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

// ==================== SMS ====================
// Un SMS con tildes (á, í, ó, ú) se cobra en partes de 70 caracteres; sin ellas,
// de 160. Por eso el mensaje de texto es corto y sin tildes: cabe en un solo SMS.

export const LIMITE_SMS = 160;

const sinTildes = (texto: string): string => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** "dom 22 nov" */
const diaCorto = (fecha: string): string => new Date(`${fecha}T12:00:00`)
  .toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })
  .replace(/\./g, '').replace(',', '');

/** "Mateo Vera" (primer nombre y primer apellido) */
const nombreCorto = (cita: Cita): string | undefined => {
  const nombres = cita.datosPaciente?.nombres?.split(' ')[0];
  const apellidos = cita.datosPaciente?.apellidos?.split(' ')[0];
  return nombres && apellidos ? `${nombres} ${apellidos}` : cita.paciente;
};

/** Mensaje de texto corto (sin tildes, normalmente un solo SMS) */
export function mensajeSMS(cita: Cita): string {
  const base = `Clinica Odontologica ULEAM: ${nombreCorto(cita)} tiene cita de ${cita.consulta.toLowerCase()} `
    + `el ${diaCorto(cita.fecha)} a las ${cita.hora}.`;
  // Se agregan las indicaciones, de la más a la menos importante, mientras quepan en un SMS,
  // y luego se escriben en orden natural
  const reprogramar = ' Si no puede asistir, responda este SMS.';
  const llegar = ' Llegue 10 min antes.';
  const cabe = (t: string) => sinTildes(t).length <= LIMITE_SMS;
  const conReprogramar = cabe(base + reprogramar);
  const conLlegar = cabe(base + (conReprogramar ? reprogramar : '') + llegar);
  const texto = base + (conLlegar ? llegar : '') + (conReprogramar ? reprogramar : '');
  return sinTildes(texto);
}

/**
 * Enlace que abre la app de mensajes con el texto listo.
 * En iPhone el texto va después de "&"; en Android, después de "?".
 */
export function enlaceSMS(telefono: string, mensaje: string): string {
  const numero = `+593${String(telefono).replace(/\D/g, '').replace(/^0/, '')}`;
  const separador = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?';
  return `sms:${numero}${separador}body=${encodeURIComponent(mensaje)}`;
}
