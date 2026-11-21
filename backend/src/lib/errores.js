// ==================== ERRORES DE LA API ====================
// Lanza un ErrorApi desde cualquier ruta y el manejador central responde
// con el código HTTP y un mensaje en español.

export class ErrorApi extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

export const noEncontrado = (recurso = 'Recurso') => new ErrorApi(404, `${recurso} no encontrado.`);
export const solicitudInvalida = (mensaje, detalles) => new ErrorApi(400, mensaje, detalles);
export const noAutorizado = (mensaje = 'Debes iniciar sesión.') => new ErrorApi(401, mensaje);
export const prohibido = (mensaje = 'No tienes permiso para esta acción.') => new ErrorApi(403, mensaje);
export const conflicto = (mensaje) => new ErrorApi(409, mensaje);
