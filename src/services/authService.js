// ==================== SERVICIO DE AUTENTICACIÓN Y USUARIOS ====================
// Único lugar donde vive la lógica de login, sesión y usuarios.
//
// ⚠️ MODO DEMO: los usuarios se guardan en localStorage y las claves en texto
// plano. Sirve para probar la app sin backend. En producción:
//   - iniciarSesion() llamará a POST /auth/login y el servidor devolverá
//     un token con el rol del usuario.
//   - listarUsuarios(), crearUsuario() y cambiarEstadoUsuario() llamarán
//     a la API de usuarios (solo para administradores).
// El resto de la app no tiene que cambiar.

import { generarId } from './clinica';

const SESION_KEY = 'sesion';
const USUARIOS_KEY = 'usuariosDemo';
export const EVENTO_USUARIOS = 'usuariosUpdate';

export const ROLES = Object.freeze({
  ADMIN: 'Administrador',
  RECEPCIONISTA: 'Recepcionista',
  ENFERMERA: 'Enfermera',
  ODONTOLOGA: 'Odontologa',
});

// Texto que se muestra en pantalla (los valores de ROLES se guardan sin tilde)
export const NOMBRE_ROL = Object.freeze({
  [ROLES.ADMIN]: 'Administración',
  [ROLES.RECEPCIONISTA]: 'Recepción',
  [ROLES.ENFERMERA]: 'Enfermería',
  [ROLES.ODONTOLOGA]: 'Odontología',
});

const USUARIOS_INICIALES = [
  { nombre: 'Administrador', email: 'admin@live.uleam.edu.ec', rol: ROLES.ADMIN },
  { nombre: 'Recepcionista', email: 'recepcionista@live.uleam.edu.ec', rol: ROLES.RECEPCIONISTA },
  { nombre: 'Enfermera', email: 'enfermera@live.uleam.edu.ec', rol: ROLES.ENFERMERA },
  { nombre: 'Odontóloga', email: 'odontologa@live.uleam.edu.ec', rol: ROLES.ODONTOLOGA },
].map((u) => ({ ...u, id: `usr_${u.rol}`, pass: '1234', activo: true, creado: null }));

// ==================== USUARIOS ====================

const leerUsuarios = () => {
  try {
    const guardados = JSON.parse(localStorage.getItem(USUARIOS_KEY));
    if (Array.isArray(guardados) && guardados.length) return guardados;
  } catch {
    // datos corruptos: se vuelve a los iniciales
  }
  return structuredClone(USUARIOS_INICIALES);
};

const guardarUsuarios = (usuarios) => {
  localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
  window.dispatchEvent(new CustomEvent(EVENTO_USUARIOS));
};

// La clave nunca sale de este archivo
const sinClave = (usuario) => {
  const copia = { ...usuario };
  delete copia.pass;
  return copia;
};

export async function listarUsuarios() {
  return leerUsuarios().map(sinClave);
}

export async function crearUsuario({ nombre, email, rol, pass }) {
  const usuarios = leerUsuarios();
  const correo = email.trim().toLowerCase();
  if (usuarios.some((u) => u.email === correo)) {
    throw new Error('Ya existe un usuario con ese correo.');
  }
  const nuevo = {
    id: generarId('usr'),
    nombre: nombre.trim(),
    email: correo,
    rol,
    pass,
    activo: true,
    creado: new Date().toISOString(),
  };
  guardarUsuarios([...usuarios, nuevo]);
  return sinClave(nuevo);
}

export async function cambiarEstadoUsuario(id, activo) {
  const usuarios = leerUsuarios();
  const usuario = usuarios.find((u) => u.id === id);
  if (!usuario) throw new Error('Usuario no encontrado.');
  const adminsActivos = usuarios.filter((u) => u.rol === ROLES.ADMIN && u.activo).length;
  if (usuario.rol === ROLES.ADMIN && !activo && adminsActivos === 1) {
    throw new Error('Debe quedar al menos un administrador activo.');
  }
  usuario.activo = activo;
  guardarUsuarios(usuarios);
}

// ==================== SESIÓN ====================

/**
 * Valida las credenciales. El rol lo decide el sistema, no el usuario.
 * Devuelve la sesión creada o lanza un Error con un mensaje para mostrar.
 */
export async function iniciarSesion(email, password) {
  const correo = email.trim().toLowerCase();
  const usuario = leerUsuarios().find((u) => u.email === correo);

  if (!usuario || usuario.pass !== password) {
    throw new Error('Correo o contraseña incorrectos.');
  }
  if (!usuario.activo) {
    throw new Error('Tu usuario está desactivado. Contacta al administrador.');
  }

  const sesion = {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    inicio: new Date().toISOString(),
  };
  sessionStorage.setItem(SESION_KEY, JSON.stringify(sesion));
  sessionStorage.setItem('mostrarBienvenida', 'true');
  return sesion;
}

export function obtenerSesion() {
  try {
    const sesion = JSON.parse(sessionStorage.getItem(SESION_KEY));
    return sesion?.rol ? sesion : null;
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  sessionStorage.clear();
}
