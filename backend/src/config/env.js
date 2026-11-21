// ==================== CONFIGURACIÓN ====================
// Lee las variables de entorno una sola vez y falla al arrancar si falta algo,
// en lugar de fallar más tarde en medio de una petición.

import 'dotenv/config';

const requerida = (nombre) => {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisa tu archivo .env (usa .env.example como guía).`);
  }
  return valor;
};

const jwtSecret = requerida('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres. Genera una con el comando que está en .env.example.');
}
if (process.env.NODE_ENV === 'production' && jwtSecret.startsWith('cambia-esta-clave')) {
  throw new Error('En producción JWT_SECRET no puede ser la clave de ejemplo.');
}

export const config = Object.freeze({
  entorno: process.env.NODE_ENV || 'development',
  esProduccion: process.env.NODE_ENV === 'production',
  puerto: Number(process.env.PORT) || 3000,
  databaseUrl: requerida('DATABASE_URL'),
  jwtSecret,
  sesionHoras: Number(process.env.SESION_HORAS) || 10,
  // Bloqueo por intentos fallidos de inicio de sesión
  maxIntentos: 5,
  minutosBloqueo: 15,
  // Varios orígenes separados por coma: "http://localhost:5173,https://clinica.uleam.edu.ec"
  corsOrigenes: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
});
