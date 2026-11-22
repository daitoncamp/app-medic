// ==================== VALIDACIÓN DE DATOS DE ENTRADA ====================
// Usa esquemas de Zod: https://zod.dev

import type { z } from 'zod';
import { solicitudInvalida, type Detalles } from './errores.ts';

/**
 * Valida `datos` con un esquema de Zod y devuelve los datos limpios.
 * Si no son válidos lanza un 400 con el mensaje de cada campo:
 *   { error: 'Revisa los datos enviados.', detalles: { email: 'Correo inválido.' } }
 */
/**
 * Parámetro de la ruta (/:id) como texto. Express lo tipa como string | string[]
 * porque las rutas con comodín (*) devuelven listas; aquí nunca se usan.
 */
export const parametro = (valor: string | string[] | undefined): string =>
  (Array.isArray(valor) ? valor.join('/') : valor ?? '');

export function validar<E extends z.ZodTypeAny>(esquema: E, datos: unknown): z.output<E> {
  const resultado = esquema.safeParse(datos ?? {});
  if (resultado.success) return resultado.data;
  const detalles: Detalles = {};
  resultado.error.issues.forEach((issue) => {
    const campo = issue.path.join('.') || 'general';
    if (!detalles[campo]) detalles[campo] = issue.message;
  });
  throw solicitudInvalida('Revisa los datos enviados.', detalles);
}
