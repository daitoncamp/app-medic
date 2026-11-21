// ==================== VALIDACIÓN DE DATOS DE ENTRADA ====================
// Usa esquemas de Zod: https://zod.dev

import { solicitudInvalida } from './errores.js';

/**
 * Valida `datos` con un esquema de Zod y devuelve los datos limpios.
 * Si no son válidos lanza un 400 con el mensaje de cada campo:
 *   { error: 'Revisa los datos enviados.', detalles: { email: 'Correo inválido.' } }
 */
export function validar(esquema, datos) {
  const resultado = esquema.safeParse(datos ?? {});
  if (resultado.success) return resultado.data;
  const detalles = {};
  resultado.error.issues.forEach((issue) => {
    const campo = issue.path.join('.') || 'general';
    if (!detalles[campo]) detalles[campo] = issue.message;
  });
  throw solicitudInvalida('Revisa los datos enviados.', detalles);
}
