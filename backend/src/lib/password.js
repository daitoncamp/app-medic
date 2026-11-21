// ==================== CONTRASEÑAS ====================
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const COSTO = 12;

export const hashPassword = (texto) => bcrypt.hash(texto, COSTO);
export const compararPassword = (texto, hash) => bcrypt.compare(texto, hash);

// Hash de una contraseña cualquiera: se compara contra él cuando el correo no existe,
// para que la respuesta tarde lo mismo y no revele qué correos están registrados.
export const HASH_FALSO = bcrypt.hashSync('contraseña-que-nadie-usa', COSTO);

/** Reglas de una contraseña nueva */
export const esquemaPassword = z
  .string({ required_error: 'La contraseña es obligatoria.' })
  .min(8, 'Mínimo 8 caracteres.')
  .max(72, 'Máximo 72 caracteres.') // límite de bcrypt
  .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, 'Debe tener al menos una letra.')
  .regex(/\d/, 'Debe tener al menos un número.');
