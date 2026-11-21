// ==================== MÉTRICAS DE LOS DASHBOARDS ====================
// Funciones puras: reciben los datos y devuelven números listos para mostrar.
// Con el backend, estos cálculos pueden pasar a consultas SQL.

import { ESTADOS_CITA, fechaLocalISO } from '../../services/clinica';

const hoy = () => fechaLocalISO();
const esHoy = (valorISO) => Boolean(valorISO) && fechaLocalISO(valorISO) === hoy();
const porHora = (a, b) => String(a.hora).localeCompare(String(b.hora));

export const citasDeHoy = (datos) =>
  datos.citasDelDia.filter((c) => c.fecha === hoy()).sort(porHora);

export const contarPorEstado = (citas) =>
  Object.values(ESTADOS_CITA).reduce((acc, estado) => {
    acc[estado] = citas.filter((c) => c.estado === estado).length;
    return acc;
  }, {});

/** Citas de hoy agrupadas por hora (de 7:00 a 18:00, más las que caigan fuera) */
export const agendaPorHora = (citas) => {
  const horaActual = new Date().getHours();
  const conteo = new Map();
  for (let h = 7; h <= 18; h += 1) conteo.set(h, 0);
  citas.forEach((c) => {
    const h = Number(String(c.hora).slice(0, 2));
    if (!Number.isNaN(h)) conteo.set(h, (conteo.get(h) || 0) + 1);
  });
  return [...conteo.entries()]
    .sort(([a], [b]) => a - b)
    .map(([h, value]) => ({ label: `${h}h`, value, highlight: h === horaActual }));
};

export const minutosDesde = (valorISO) =>
  valorISO ? Math.max(0, Math.round((Date.now() - new Date(valorISO)) / 60000)) : null;

export const tiempoPromedioEspera = (datos) => {
  const valores = datos.historialAtenciones
    .filter((a) => esHoy(a.fecha) && Number.isFinite(a.minutosEspera))
    .map((a) => a.minutosEspera);
  if (!valores.length) return null;
  return Math.round(valores.reduce((s, v) => s + v, 0) / valores.length);
};

export const preparadosHoy = (datos) =>
  datos.historialAtenciones.filter((a) => esHoy(a.fecha)).length;

export const alertasDeHoy = (datos) =>
  datos.alertasMedicas.filter((a) => esHoy(a.fecha));

export const atendidosHoy = (datos) =>
  datos.citasDelDia.filter((c) => c.estado === ESTADOS_CITA.ATENDIDA && esHoy(c.fechaAtencion)).length;

/** Procedimientos registrados en el mes actual, del más al menos frecuente */
export const procedimientosDelMes = (datos) => {
  const mes = hoy().slice(0, 7);
  const conteo = {};
  datos.historialOdontologico
    .filter((h) => fechaLocalISO(h.fechaRegistro || Date.now()).slice(0, 7) === mes)
    .forEach((h) => { conteo[h.procedimiento] = (conteo[h.procedimiento] || 0) + 1; });
  return Object.entries(conteo)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};

/** Citas de los últimos 7 días (incluido hoy) */
export const citasUltimos7Dias = (datos) => {
  const dias = [];
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
export const tasaInasistencia = (datos) => {
  const pasadas = datos.citasDelDia.filter((c) => c.fecha && c.fecha <= hoy()
    && [ESTADOS_CITA.ATENDIDA, ESTADOS_CITA.NO_ASISTIO].includes(c.estado));
  if (!pasadas.length) return null;
  const faltas = pasadas.filter((c) => c.estado === ESTADOS_CITA.NO_ASISTIO).length;
  return Math.round((faltas / pasadas.length) * 100);
};
