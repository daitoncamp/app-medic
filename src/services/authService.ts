// ==================== SERVICIO DE AUTENTICACIÓN Y USUARIOS ====================
// Habla con la API (/api/auth y /api/usuarios). Las contraseñas se validan y
// guardan cifradas en el servidor; el navegador nunca ve el token de sesión
// (viaja en una cookie httpOnly).
//
// En sessionStorage solo se guarda una copia de los datos del usuario para que
// la interfaz pueda leerla al instante (nombre, rol). La API vuelve a verificar
// la sesión en cada petición.

import { api } from './api';
import type { RolApi, UsuarioApi } from '../types/api';
import type { Rol, Usuario } from '../types/dominio';

const SESION_KEY = 'sesion';
export const EVENTO_USUARIOS = 'usuariosUpdate';

export const ROLES = Object.freeze({
  ADMIN: 'Administrador',
  RECEPCIONISTA: 'Recepcionista',
  ENFERMERA: 'Enfermera',
  ODONTOLOGA: 'Odontologa',
} as const);

// Texto que se muestra en pantalla
export const NOMBRE_ROL: Readonly<Record<Rol, string>> = Object.freeze({
  [ROLES.ADMIN]: 'Administración',
  [ROLES.RECEPCIONISTA]: 'Recepción',
  [ROLES.ENFERMERA]: 'Enfermería',
  [ROLES.ODONTOLOGA]: 'Odontología',
});

// El backend usa ADMIN, RECEPCIONISTA…; la app usa los valores de ROLES
const DESDE_API: Record<RolApi, Rol> = {
  ADMIN: ROLES.ADMIN,
  RECEPCIONISTA: ROLES.RECEPCIONISTA,
  ENFERMERA: ROLES.ENFERMERA,
  ODONTOLOGA: ROLES.ODONTOLOGA,
};
const HACIA_API = Object.fromEntries(Object.entries(DESDE_API).map(([api, app]) => [app, api])) as Record<Rol, RolApi>;

const adaptarUsuario = (u: UsuarioApi): Usuario => ({ ...u, rol: DESDE_API[u.rol] });

interface RespuestaUsuario { usuario: UsuarioApi }

// ==================== SESIÓN ====================

const guardarSesion = (usuario: UsuarioApi): Usuario => {
  const sesion = adaptarUsuario(usuario);
  sessionStorage.setItem(SESION_KEY, JSON.stringify(sesion));
  return sesion;
};

const borrarSesion = () => {
  sessionStorage.removeItem(SESION_KEY);
  sessionStorage.removeItem('mostrarBienvenida');
};

/** Lee la copia local de la sesión (lectura inmediata para la interfaz) */
export function obtenerSesion(): Usuario | null {
  try {
    const sesion = JSON.parse(sessionStorage.getItem(SESION_KEY) ?? 'null') as Usuario | null;
    return sesion?.rol ? sesion : null;
  } catch {
    return null;
  }
}

/**
 * Sesión de las pantallas protegidas: <ProtectedRoute> ya comprobó que existe.
 * Si no hubiera (no debería pasar), lanza un error en lugar de seguir con datos vacíos.
 */
export function sesionActual(): Usuario {
  const sesion = obtenerSesion();
  if (!sesion) throw new Error('No hay una sesión iniciada.');
  return sesion;
}

/**
 * Inicia sesión. El rol lo decide el servidor.
 * Lanza un Error con el mensaje para mostrar si algo falla.
 */
export async function iniciarSesion(email: string, password: string): Promise<Usuario> {
  const { usuario } = await api<RespuestaUsuario>('/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
    avisarSiExpira: false,
  });
  sessionStorage.setItem('mostrarBienvenida', 'true');
  return guardarSesion(usuario);
}

/**
 * Pregunta al servidor si la cookie de sesión sigue siendo válida.
 * Se llama al abrir la app. Devuelve la sesión o null.
 */
export async function verificarSesion(): Promise<Usuario | null> {
  try {
    const { usuario } = await api<RespuestaUsuario>('/auth/yo', { avisarSiExpira: false });
    return guardarSesion(usuario);
  } catch {
    borrarSesion();
    return null;
  }
}

export async function cerrarSesion(): Promise<void> {
  try {
    await api('/auth/logout', { method: 'POST', avisarSiExpira: false });
  } catch {
    // Aunque el servidor no responda, la sesión local se borra
  } finally {
    borrarSesion();
  }
}

/** Borra la copia local sin llamar al servidor (sesión vencida) */
export const olvidarSesion = borrarSesion;

export async function cambiarPassword(actual: string, nueva: string): Promise<Usuario> {
  const { usuario } = await api<RespuestaUsuario>('/auth/cambiar-password', { method: 'POST', body: { actual, nueva } });
  return guardarSesion(usuario);
}

// ==================== USUARIOS (administración) ====================

const avisarCambioUsuarios = () => window.dispatchEvent(new CustomEvent(EVENTO_USUARIOS));

export async function listarUsuarios(): Promise<Usuario[]> {
  const { usuarios } = await api<{ usuarios: UsuarioApi[] }>('/usuarios');
  return usuarios.map(adaptarUsuario);
}

export interface NuevoUsuario {
  nombre: string;
  email: string;
  rol: Rol;
  password: string;
}

export async function crearUsuario({ nombre, email, rol, password }: NuevoUsuario): Promise<Usuario> {
  const { usuario } = await api<RespuestaUsuario>('/usuarios', {
    method: 'POST',
    body: { nombre, email, rol: HACIA_API[rol], password },
  });
  avisarCambioUsuarios();
  return adaptarUsuario(usuario);
}

export async function cambiarEstadoUsuario(id: string, activo: boolean): Promise<Usuario> {
  const { usuario } = await api<RespuestaUsuario>(`/usuarios/${id}`, { method: 'PATCH', body: { activo } });
  avisarCambioUsuarios();
  return adaptarUsuario(usuario);
}

export async function restablecerPassword(id: string, password: string): Promise<Usuario> {
  const { usuario } = await api<RespuestaUsuario>(`/usuarios/${id}/restablecer-password`, { method: 'POST', body: { password } });
  avisarCambioUsuarios();
  return adaptarUsuario(usuario);
}
