// ==================== SERVICIO DE AUTENTICACIÓN ====================
// Único lugar donde vive la lógica de login/sesión.
//
// ⚠️ MODO DEMO: los usuarios están aquí solo para pruebas locales.
// Todo lo que está en el frontend es visible para cualquiera en el navegador,
// así que en producción esta función debe llamar a un backend real
// (por ejemplo Supabase Auth) que valide credenciales y devuelva el rol.
// Al migrar, solo hay que reemplazar `iniciarSesion`; el resto de la app no cambia.

const SESION_KEY = 'sesion';

export const ROLES = Object.freeze({
  RECEPCIONISTA: 'Recepcionista',
  ENFERMERA: 'Enfermera',
  ODONTOLOGA: 'Odontologa',
});

export const RUTA_POR_ROL = Object.freeze({
  [ROLES.RECEPCIONISTA]: '/recepcionista-dashboard',
  [ROLES.ENFERMERA]: '/enfermera-dashboard',
  [ROLES.ODONTOLOGA]: '/odontologa-dashboard',
});

export const RUTA_LOGIN_POR_ROL = Object.freeze({
  [ROLES.RECEPCIONISTA]: '/login-recepcionista',
  [ROLES.ENFERMERA]: '/login-enfermera',
  [ROLES.ODONTOLOGA]: '/login-odontologa',
});

// Usuarios de demostración (eliminar al conectar el backend).
// `nombre` queda vacío porque el toast de bienvenida ya muestra el rol.
const USUARIOS_DEMO = {
  'recepcionista@live.uleam.edu.ec': { pass: '1234', rol: ROLES.RECEPCIONISTA, nombre: '' },
  'enfermera@live.uleam.edu.ec': { pass: '1234', rol: ROLES.ENFERMERA, nombre: '' },
  'odontologa@live.uleam.edu.ec': { pass: '1234', rol: ROLES.ODONTOLOGA, nombre: '' },
};

/**
 * Valida credenciales para un rol concreto.
 * Devuelve la sesión creada o lanza un Error con un mensaje para el usuario.
 * Es async para que el reemplazo por una llamada a la API no cambie a quien la usa.
 */
export async function iniciarSesion(email, password, rolRequerido) {
  const correo = email.trim().toLowerCase();
  const usuario = USUARIOS_DEMO[correo];

  if (!usuario || usuario.pass !== password || usuario.rol !== rolRequerido) {
    throw new Error('Credenciales incorrectas para este acceso.');
  }

  const sesion = { email: correo, rol: usuario.rol, nombre: usuario.nombre, inicio: Date.now() };
  sessionStorage.setItem(SESION_KEY, JSON.stringify(sesion));
  // Claves que ya usan los dashboards para el mensaje de bienvenida
  sessionStorage.setItem('rol', usuario.rol);
  sessionStorage.setItem('nombre', usuario.nombre);
  sessionStorage.setItem('mostrarBienvenida', 'true');
  return sesion;
}

export function obtenerSesion() {
  try {
    const sesion = JSON.parse(sessionStorage.getItem(SESION_KEY));
    return sesion && sesion.rol ? sesion : null;
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  sessionStorage.clear();
}
