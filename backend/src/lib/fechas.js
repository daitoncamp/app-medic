// ==================== FECHAS EN HORA DE ECUADOR ====================
// La base de datos guarda instantes en UTC. La clínica trabaja en hora de
// Ecuador continental (UTC-5, sin horario de verano), así que las fechas y
// horas que llegan del frontend ("2026-11-21", "09:30") se interpretan así.

export const OFFSET = '-05:00';
const OFFSET_MS = -5 * 3600 * 1000;

/** "2026-11-21" + "09:30" → instante (Date en UTC) */
export const aInstante = (fecha, hora = '00:00') => new Date(`${fecha}T${hora}:00${OFFSET}`);

/** Date → "2026-11-21" en Ecuador */
export const fechaLocal = (date) => new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);

/** Date → "09:30" en Ecuador */
export const horaLocal = (date) => new Date(date.getTime() + OFFSET_MS).toISOString().slice(11, 16);

export const hoyLocal = () => fechaLocal(new Date());

/** Inicio y fin (exclusivo) de un día de Ecuador */
export const rangoDia = (fecha) => {
  const desde = aInstante(fecha);
  return { desde, hasta: new Date(desde.getTime() + 24 * 3600 * 1000) };
};

/** Suma días a una fecha "YYYY-MM-DD" */
export const sumarDias = (fecha, dias) => fechaLocal(new Date(aInstante(fecha, '12:00').getTime() + dias * 86400000));

/**
 * Edad cumplida a una fecha de referencia.
 * Devuelve { anios, meses } (meses = total de meses, útil en bebés).
 */
export const calcularEdad = (fechaNacimiento, referencia = new Date()) => {
  const nac = new Date(fechaNacimiento);
  const ref = new Date(referencia.getTime() + OFFSET_MS);
  let meses = (ref.getUTCFullYear() - nac.getUTCFullYear()) * 12 + (ref.getUTCMonth() - nac.getUTCMonth());
  if (ref.getUTCDate() < nac.getUTCDate()) meses -= 1;
  meses = Math.max(0, meses);
  return { anios: Math.floor(meses / 12), meses };
};
