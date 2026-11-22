// ==================== ERRORES DE LA API ====================
// Lanza un ErrorApi desde cualquier ruta y el manejador central responde
// con el código HTTP y un mensaje en español.

/** Mensaje de error por campo: { email: 'Correo inválido.' } */
export type Detalles = Record<string, string>;

export class ErrorApi extends Error {
  status: number;
  detalles: Detalles | undefined;

  constructor(status: number, mensaje: string, detalles?: Detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

export const noEncontrado = (recurso = 'Recurso') => new ErrorApi(404, `${recurso} no encontrado.`);
export const solicitudInvalida = (mensaje: string, detalles?: Detalles) => new ErrorApi(400, mensaje, detalles);
export const noAutorizado = (mensaje = 'Debes iniciar sesión.') => new ErrorApi(401, mensaje);
export const prohibido = (mensaje = 'No tienes permiso para esta acción.') => new ErrorApi(403, mensaje);
export const conflicto = (mensaje: string) => new ErrorApi(409, mensaje);
