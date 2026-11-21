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

export const config = Object.freeze({
  entorno: process.env.NODE_ENV || 'development',
  esProduccion: process.env.NODE_ENV === 'production',
  puerto: Number(process.env.PORT) || 3000,
  databaseUrl: requerida('DATABASE_URL'),
  // Varios orígenes separados por coma: "http://localhost:5173,https://clinica.uleam.edu.ec"
  corsOrigenes: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
});
