// ==================== CLIENTE DE LA API ====================
// Todas las llamadas al backend pasan por aquí.
// La sesión viaja en una cookie httpOnly que el navegador envía solo.

export const EVENTO_SESION_EXPIRADA = 'sesionExpirada';

export class ErrorApi extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles || {};
  }
}

const BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * api('/auth/login', { method: 'POST', body: { email, password } })
 * Devuelve el JSON de la respuesta o lanza ErrorApi con el mensaje del servidor.
 */
export async function api(ruta, { method = 'GET', body, avisarSiExpira = true } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Revisa que el backend esté encendido.');
  }

  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    // Sesión vencida o inválida en medio del trabajo: se avisa a la app
    if (respuesta.status === 401 && avisarSiExpira) {
      window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA));
    }
    throw new ErrorApi(
      respuesta.status,
      datos?.error || `Error ${respuesta.status} del servidor.`,
      datos?.detalles,
    );
  }
  return datos;
}
