// Formatos de fecha y hora en español (Ecuador)

/** Fecha como texto ISO, Date o vacío */
export type ValorFecha = string | Date | null | undefined;

const esFechaSola = (valor: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(valor);

// Convierte el valor a Date. Las fechas "YYYY-MM-DD" se toman como hora local.
export const aFecha = (valor: ValorFecha): Date | null => {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  const fecha = esFechaSola(valor) ? new Date(`${valor}T00:00:00`) : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

/** 21 nov 2026 (si el valor no es una fecha válida, lo devuelve tal cual) */
export const formatearFecha = (valor: ValorFecha): string => {
  const fecha = aFecha(valor);
  if (!fecha) return typeof valor === 'string' && valor ? valor : '—';
  return fecha.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** 21 nov 2026, 14:30 */
export const formatearFechaHora = (valor: ValorFecha): string => {
  const fecha = aFecha(valor);
  if (!fecha) return typeof valor === 'string' && valor ? valor : '—';
  if (typeof valor === 'string' && esFechaSola(valor)) return formatearFecha(valor);
  return fecha.toLocaleString('es-EC', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/** Sábado, 21 de noviembre de 2026 */
export const fechaLarga = (valor: ValorFecha = new Date()): string => {
  const texto = (aFecha(valor) ?? new Date()).toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/** Iniciales para avatares: "María López" → "ML" */
export const iniciales = (nombre = ''): string =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('') || '?';

/** Edad legible a partir de la fecha de nacimiento: "5 años", "8 meses" */
export const edadTexto = (fechaNacimiento: ValorFecha): string => {
  const nac = aFecha(fechaNacimiento);
  if (!nac) return '';
  const hoy = new Date();
  let meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth());
  if (hoy.getDate() < nac.getDate()) meses -= 1;
  if (meses < 0) return '';
  if (meses < 24) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  return `${Math.floor(meses / 12)} años`;
};
