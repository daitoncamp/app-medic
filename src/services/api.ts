// ==================== CLIENTE DE LA API ====================
// Todas las llamadas al backend pasan por aquí.
// La sesión viaja en una cookie httpOnly que el navegador envía solo.

export const EVENTO_SESION_EXPIRADA = 'sesionExpirada';

export class ErrorApi extends Error {
  status: number;
  detalles: Record<string, string> | null;

  constructor(status: number, mensaje: string, detalles?: Record<string, string> | null) {
    super(mensaje);
    this.status = status;
    // Errores por campo ({ campo: mensaje }) o null si el error no es de un campo
    this.detalles = detalles && Object.keys(detalles).length ? detalles : null;
  }
}

const BASE: string = import.meta.env?.VITE_API_URL || '/api';

/**
 * api('/auth/login', { method: 'POST', body: { email, password } })
 * Devuelve el JSON de la respuesta o lanza ErrorApi con el mensaje del servidor.
 */
interface OpcionesApi {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Si es false, un 401 no dispara el aviso de sesión vencida (login, verificar sesión) */
  avisarSiExpira?: boolean;
}

/** Cuerpo de error que envía el backend */
interface CuerpoError {
  error?: string;
  detalles?: Record<string, string>;
}

/**
 * El tipo T es la forma de la respuesta (ver src/types/api.ts). El servidor no la
 * garantiza en tiempo de ejecución: es un acuerdo con el backend.
 */
export async function api<T = unknown>(
  ruta: string,
  { method = 'GET', body, avisarSiExpira = true }: OpcionesApi = {},
): Promise<T> {
  let respuesta: Response;
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

  if (respuesta.status === 204) return null as T;
  const datos: unknown = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    // Sesión vencida o inválida en medio del trabajo: se avisa a la app
    if (respuesta.status === 401 && avisarSiExpira) {
      window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA));
    }
    const cuerpo = (datos ?? {}) as CuerpoError;
    throw new ErrorApi(
      respuesta.status,
      cuerpo.error || `Error ${respuesta.status} del servidor.`,
      cuerpo.detalles,
    );
  }
  return datos as T;
}
