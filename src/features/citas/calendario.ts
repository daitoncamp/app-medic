// ==================== FECHAS DEL CALENDARIO ====================
// Fechas como texto "YYYY-MM-DD" en hora local. Las semanas empiezan el lunes.

import { fechaLocalISO } from '../../services/clinica';

/** Vista del calendario */
export type Vista = 'semana' | 'mes';

const aDate = (fecha: string): Date => new Date(`${fecha}T12:00:00`);

export const sumarDias = (fecha: string, dias: number): string => {
  const d = aDate(fecha);
  d.setDate(d.getDate() + dias);
  return fechaLocalISO(d);
};

/** Lunes de la semana de la fecha */
export const inicioSemana = (fecha: string): string => sumarDias(fecha, -((aDate(fecha).getDay() + 6) % 7));

/** Los 7 días (lunes a domingo) de la semana de la fecha */
export const diasDeSemana = (fecha: string): string[] => {
  const lunes = inicioSemana(fecha);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
};

export const sumarMeses = (fecha: string, meses: number): string => {
  const d = aDate(fecha);
  d.setDate(1);
  d.setMonth(d.getMonth() + meses);
  return fechaLocalISO(d);
};

/**
 * Semanas completas (lunes a domingo) que cubren el mes de la fecha.
 * Devuelve [[fecha × 7], …]; incluye días del mes anterior y siguiente para completar.
 */
export const semanasDelMes = (fecha: string): string[][] => {
  const primero = `${fecha.slice(0, 7)}-01`;
  const ultimo = sumarDias(sumarMeses(primero, 1), -1);
  const semanas: string[][] = [];
  for (let lunes = inicioSemana(primero); lunes <= ultimo; lunes = sumarDias(lunes, 7)) {
    semanas.push(Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)));
  }
  return semanas;
};

/** Rango que pide la vista al servidor */
export const rangoVista = (vista: Vista, fecha: string): { desde: string; hasta: string } => {
  if (vista === 'semana') {
    const dias = diasDeSemana(fecha);
    return { desde: dias[0], hasta: dias[6] };
  }
  const semanas = semanasDelMes(fecha);
  return { desde: semanas[0][0], hasta: semanas[semanas.length - 1][6] };
};

const formato = (fecha: string, opciones: Intl.DateTimeFormatOptions): string => aDate(fecha).toLocaleDateString('es-EC', opciones);

/** "16 – 22 nov 2026" o "Noviembre de 2026" */
export const tituloVista = (vista: Vista, fecha: string): string => {
  if (vista === 'semana') {
    const [lunes, , , , , , domingo] = diasDeSemana(fecha);
    const mismoMes = lunes.slice(0, 7) === domingo.slice(0, 7);
    const inicio = formato(lunes, mismoMes ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
    return `${inicio} – ${formato(domingo, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  const texto = formato(fecha, { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/** "Lun 16" */
export const encabezadoDia = (fecha: string): string => {
  const dia = formato(fecha, { weekday: 'short' }).replace('.', '');
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${aDate(fecha).getDate()}`;
};

export const NOMBRES_DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
