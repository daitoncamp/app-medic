// ==================== MÉTRICAS DE LOS DASHBOARDS ====================
// Funciones puras: reciben las citas de la API y devuelven números listos para mostrar.
// Las métricas de enfermería y odontología las calcula el servidor.

import { ESTADOS_CITA, fechaLocalISO } from '../../services/clinica';
import type { Barra, Cita, EstadoCita } from '../../types/dominio';

const hoy = () => fechaLocalISO();

export const contarPorEstado = (citas: Cita[]): Record<EstadoCita, number> =>
  Object.values(ESTADOS_CITA).reduce((acc, estado) => {
    acc[estado] = citas.filter((c) => c.estado === estado).length;
    return acc;
  }, {} as Record<EstadoCita, number>);

/** Citas de hoy agrupadas por hora (de 7:00 a 18:00, más las que caigan fuera) */
export const agendaPorHora = (citas: Pick<Cita, 'hora'>[]): Barra[] => {
  const horaActual = new Date().getHours();
  const conteo = new Map<number, number>();
  for (let h = 7; h <= 18; h += 1) conteo.set(h, 0);
  citas.forEach((c) => {
    const h = Number(String(c.hora).slice(0, 2));
    if (!Number.isNaN(h)) conteo.set(h, (conteo.get(h) || 0) + 1);
  });
  return [...conteo.entries()]
    .sort(([a], [b]) => a - b)
    .map(([h, value]) => ({ label: `${h}h`, value, highlight: h === horaActual }));
};

export const minutosDesde = (valorISO: string | null | undefined): number | null =>
  valorISO ? Math.max(0, Math.round((Date.now() - new Date(valorISO).getTime()) / 60000)) : null;

/** Citas de los últimos 7 días (incluido hoy) */
export const citasUltimos7Dias = (datos: { citasDelDia: Cita[] }): Barra[] => {
  const dias: Barra[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = fechaLocalISO(d);
    dias.push({
      label: i === 0 ? 'Hoy' : d.toLocaleDateString('es-EC', { weekday: 'short' }).replace('.', ''),
      value: datos.citasDelDia.filter((c) => c.fecha === iso).length,
      highlight: i === 0,
    });
  }
  return dias;
};

/** Porcentaje de citas pasadas en las que el paciente no asistió */
export const tasaInasistencia = (datos: { citasDelDia: Cita[] }): number | null => {
  const pasadas = datos.citasDelDia.filter((c) => c.fecha && c.fecha <= hoy()
    && ([ESTADOS_CITA.ATENDIDA, ESTADOS_CITA.NO_ASISTIO] as string[]).includes(c.estado));
  if (!pasadas.length) return null;
  const faltas = pasadas.filter((c) => c.estado === ESTADOS_CITA.NO_ASISTIO).length;
  return Math.round((faltas / pasadas.length) * 100);
};
