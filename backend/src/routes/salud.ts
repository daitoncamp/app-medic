import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';

export const rutasSalud = Router();

/** GET /api/salud → comprueba que la API y la base de datos respondan */
rutasSalud.get('/', async (req, res) => {
  const inicio = Date.now();
  let baseDeDatos = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    baseDeDatos = 'sin conexión';
  }
  res.status(baseDeDatos === 'ok' ? 200 : 503).json({
    estado: baseDeDatos === 'ok' ? 'ok' : 'degradado',
    baseDeDatos,
    latenciaMs: Date.now() - inicio,
    hora: new Date().toISOString(),
  });
});
