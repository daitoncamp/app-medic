// Formatos de fecha y hora en español (Ecuador)

const esFechaSola = (valor) => /^\d{4}-\d{2}-\d{2}$/.test(valor);

// Convierte el valor a Date. Las fechas "YYYY-MM-DD" se toman como hora local.
export const aFecha = (valor) => {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  const fecha = esFechaSola(valor) ? new Date(`${valor}T00:00:00`) : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

/** 21 nov 2026 (si el valor no es una fecha válida, lo devuelve tal cual) */
export const formatearFecha = (valor) => {
  const fecha = aFecha(valor);
  if (!fecha) return valor || '—';
  return fecha.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** 21 nov 2026, 14:30 */
export const formatearFechaHora = (valor) => {
  const fecha = aFecha(valor);
  if (!fecha) return valor || '—';
  if (typeof valor === 'string' && esFechaSola(valor)) return formatearFecha(valor);
  return fecha.toLocaleString('es-EC', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/** Sábado, 21 de noviembre de 2026 */
export const fechaLarga = (valor = new Date()) => {
  const texto = aFecha(valor).toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/** Iniciales para avatares: "María López" → "ML" */
export const iniciales = (nombre = '') =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('') || '?';
