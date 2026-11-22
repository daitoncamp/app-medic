// ==================== CATÁLOGO DE PROCEDIMIENTOS ====================
// Única lista de procedimientos y tipos de cita. La usan recepción (tipo de cita),
// la consulta (diagnóstico), el consentimiento informado y la API (validación).
//
// consentimiento: true → requiere consentimiento informado escrito antes de
// registrarse como realizado. `plantilla` indica qué texto usa (shared/consentimientos.js).

/** Texto de consentimiento que usa cada procedimiento (ver shared/consentimientos.ts) */
export type IdPlantilla =
  | 'extraccion' | 'endodoncia' | 'restauracion' | 'corona' | 'ortodoncia' | 'pulpotomia' | 'pulpectomia'
  | 'raspado' | 'terceros' | 'drenaje' | 'protesisFija' | 'blanqueamiento';

export interface Procedimiento {
  nombre: string;
  grupo: string;
  consentimiento?: boolean;
  plantilla?: IdPlantilla;
}

export const PROCEDIMIENTOS: Procedimiento[] = [
  { nombre: 'Revisión', grupo: 'Diagnóstico' },

  { nombre: 'Limpieza', grupo: 'Prevención' },
  { nombre: 'Aplicación de flúor', grupo: 'Prevención' },
  { nombre: 'Sellantes', grupo: 'Prevención' },

  { nombre: 'Restauración con resina', grupo: 'Restauración', consentimiento: true, plantilla: 'restauracion' },
  { nombre: 'Restauración con ionómero de vidrio', grupo: 'Restauración', consentimiento: true, plantilla: 'restauracion' },
  { nombre: 'Restauración con amalgama', grupo: 'Restauración', consentimiento: true, plantilla: 'restauracion' },

  { nombre: 'Pulpotomía', grupo: 'Endodoncia', consentimiento: true, plantilla: 'pulpotomia' },
  { nombre: 'Pulpectomía', grupo: 'Endodoncia', consentimiento: true, plantilla: 'pulpectomia' },
  { nombre: 'Endodoncia', grupo: 'Endodoncia', consentimiento: true, plantilla: 'endodoncia' },

  { nombre: 'Detartraje', grupo: 'Periodoncia' },
  { nombre: 'Raspado y alisado radicular', grupo: 'Periodoncia', consentimiento: true, plantilla: 'raspado' },

  { nombre: 'Extracción', grupo: 'Cirugía', consentimiento: true, plantilla: 'extraccion' },
  { nombre: 'Cirugía de terceros molares', grupo: 'Cirugía', consentimiento: true, plantilla: 'terceros' },
  { nombre: 'Drenaje de absceso', grupo: 'Cirugía', consentimiento: true, plantilla: 'drenaje' },

  { nombre: 'Corona', grupo: 'Prótesis', consentimiento: true, plantilla: 'corona' },
  { nombre: 'Prótesis fija', grupo: 'Prótesis', consentimiento: true, plantilla: 'protesisFija' },
  { nombre: 'Prótesis removible', grupo: 'Prótesis' },

  { nombre: 'Ortodoncia', grupo: 'Ortodoncia y estética', consentimiento: true, plantilla: 'ortodoncia' },
  { nombre: 'Blanqueamiento', grupo: 'Ortodoncia y estética', consentimiento: true, plantilla: 'blanqueamiento' },
];

export const NOMBRES_PROCEDIMIENTOS = PROCEDIMIENTOS.map((p) => p.nombre);

// Motivos de cita que no son un procedimiento
const MOTIVOS_GENERALES: Procedimiento[] = [
  { nombre: 'Revisión', grupo: 'General' },
  { nombre: 'Urgencia', grupo: 'General' },
  { nombre: 'Control', grupo: 'General' },
];

/** Tipos de cita que elige recepción: motivos generales y procedimientos */
export const TIPOS_CITA = [...MOTIVOS_GENERALES, ...PROCEDIMIENTOS.filter((p) => p.nombre !== 'Revisión')];

export const NOMBRES_TIPOS_CITA = TIPOS_CITA.map((t) => t.nombre);

// Nombres de versiones anteriores que pueden estar guardados en la base de datos
const NOMBRES_ANTIGUOS: Record<string, string> = {
  'Limpieza dental': 'Limpieza',
  Resina: 'Restauración con resina',
};

/** Convierte un nombre antiguo al actual ("Resina" → "Restauración con resina") */
export const normalizarProcedimiento = (nombre: string): string => NOMBRES_ANTIGUOS[nombre] || nombre;

export const buscarProcedimiento = (nombre: string): Procedimiento | undefined =>
  PROCEDIMIENTOS.find((p) => p.nombre === normalizarProcedimiento(nombre));

/** [{ grupo, items: [...] }] en el orden del catálogo, para listas con <optgroup> */
export const agruparPorGrupo = <T extends { grupo: string }>(lista: T[]): { grupo: string; items: T[] }[] =>
  lista.reduce<{ grupo: string; items: T[] }[]>((grupos, item) => {
  const grupo = grupos.find((g) => g.grupo === item.grupo);
  if (grupo) grupo.items.push(item);
  else grupos.push({ grupo: item.grupo, items: [item] });
  return grupos;
}, []);

/**
 * Procedimiento sugerido para el motivo de la cita: el mismo nombre si es un
 * procedimiento; "Revisión" para urgencias, controles y revisiones.
 */
export const procedimientoParaCita = (tipoConsulta: string): string =>
  buscarProcedimiento(tipoConsulta)?.nombre || 'Revisión';
