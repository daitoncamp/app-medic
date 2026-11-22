// ==================== CONSTANTES Y UTILIDADES COMPARTIDAS ====================
// Los datos clínicos viven en el servidor (ver recepcionApi, enfermeriaApi y
// consultaApi). Aquí solo quedan constantes y ayudas que usan varias pantallas.

export const ESTADOS_CITA = Object.freeze({
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  EN_CONSULTA: 'En consulta',
  ATENDIDA: 'Atendida',
  NO_ASISTIO: 'No asistió',
  ANULADA: 'Anulada',
} as const);

// IDs únicos. crypto.randomUUID solo existe en contextos seguros (https o localhost).
export const generarId = (prefijo: string): string => {
  const unico = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefijo}_${unico}`;
};

// Fecha local en formato YYYY-MM-DD (toISOString usa UTC y en Ecuador
// cambia de día a las 19:00).
export const fechaLocalISO = (fecha: Date | string | number = new Date()): string => {
  const d = new Date(fecha);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

// Claves que usaban las versiones sin servidor. Contenían datos de pacientes,
// así que se borran del navegador la primera vez que se abre esta versión.
const CLAVES_ANTIGUAS = [
  'clinicaDentalSync', 'migracionRealizada', 'recepcionistaData', 'enfermeraData', 'odontologaData',
];

export const borrarDatosLocalesAntiguos = () => {
  try {
    CLAVES_ANTIGUAS.forEach((clave) => localStorage.removeItem(clave));
  } catch {
    // Navegación privada o almacenamiento bloqueado: no hay nada que borrar
  }
};
