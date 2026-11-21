// ==================== ESQUEMAS DE VALIDACIÓN COMPARTIDOS ====================
import { z } from 'zod';

const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ' ]+$/;

export const esquemaCedula = z
  .string({ required_error: 'La cédula es obligatoria.' })
  .trim()
  .regex(/^\d{10}$/, 'La cédula debe tener 10 dígitos.')
  .refine((c) => {
    const provincia = Number(c.slice(0, 2));
    return (provincia >= 1 && provincia <= 24) || provincia === 30;
  }, 'Los dos primeros dígitos no corresponden a una provincia.');

const texto = (campo) => z
  .string({ required_error: `${campo} es obligatorio.` })
  .trim()
  .min(2, `${campo}: mínimo 2 letras.`)
  .max(80)
  .regex(SOLO_LETRAS, `${campo}: solo letras y espacios.`);

export const esquemaFecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD).');
export const esquemaHora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM).');

/** Datos de un paciente que llegan desde los formularios */
export const esquemaPaciente = z.object({
  cedula: esquemaCedula,
  nombres: texto('Nombres'),
  apellidos: texto('Apellidos'),
  fechaNacimiento: esquemaFecha.refine((f) => {
    const fecha = new Date(`${f}T12:00:00Z`);
    const hoy = new Date();
    const hace120 = new Date(Date.UTC(hoy.getUTCFullYear() - 120, 0, 1));
    return !Number.isNaN(fecha.getTime()) && fecha <= hoy && fecha >= hace120;
  }, 'Fecha de nacimiento fuera de rango.'),
  sexo: z.enum(['FEMENINO', 'MASCULINO', 'OTRO'], { errorMap: () => ({ message: 'Seleccione una opción.' }) }),
  telefono: z.string().trim().regex(/^09\d{8}$/, 'Formato: 09xxxxxxxx (10 dígitos).'),
  correo: z.string().trim().toLowerCase().email('Correo inválido.').or(z.literal('')).optional()
    .transform((v) => v || null),
  contactoEmergenciaNombre: z.string().trim().max(120).optional().transform((v) => v || null),
  contactoEmergenciaTelefono: z.string().trim().regex(/^0\d{8,9}$/, 'Teléfono inválido.').or(z.literal('')).optional()
    .transform((v) => v || null),
});

export const TIPOS_ANTECEDENTE = ['ALERGIA', 'ENFERMEDAD', 'MEDICACION', 'CIRUGIA', 'EMBARAZO', 'HABITO', 'OTRO'];

export const TIPOS_CONSULTA = ['Revisión', 'Limpieza dental', 'Extracción', 'Endodoncia', 'Ortodoncia', 'Resina', 'Corona'];

// ==================== CONSULTA ODONTOLÓGICA ====================

export const PROCEDIMIENTOS = ['Limpieza', 'Extracción', 'Resina', 'Corona', 'Endodoncia', 'Ortodoncia', 'Revisión'];

/** Piezas válidas en numeración FDI (permanentes 11-48, temporales 51-85) */
export const esPiezaFDI = (n) => {
  const cuadrante = Math.floor(n / 10);
  const posicion = n % 10;
  if (cuadrante >= 1 && cuadrante <= 4) return posicion >= 1 && posicion <= 8;
  if (cuadrante >= 5 && cuadrante <= 8) return posicion >= 1 && posicion <= 5;
  return false;
};

export const esquemaPieza = z.coerce.number().int().refine(esPiezaFDI, 'Pieza dental inválida (numeración FDI).');

/** "16, 26" o [16, 26] → [16, 26] sin repetidos */
export const esquemaPiezas = z
  .union([z.string(), z.array(z.union([z.string(), z.number()]))])
  .transform((v) => (Array.isArray(v) ? v : v.split(',')).map((p) => String(p).trim()).filter(Boolean))
  .pipe(z.array(z.string().regex(/^\d{2}$/, 'Use números de 2 dígitos separados por comas (ej.: 11, 26).'))
    .min(1, 'Indica al menos una pieza.')
    .max(32, 'Demasiadas piezas.'))
  .transform((v) => [...new Set(v.map(Number))])
  .refine((v) => v.every(esPiezaFDI), (v) => ({
    message: `Pieza inválida: ${v.filter((n) => !esPiezaFDI(n)).join(', ')}. Use numeración FDI (11-48 o 51-85).`,
  }));
