import { Prisma } from '@prisma/client';
import { ErrorApi } from '../lib/errores.js';
import { config } from '../config/env.js';

/** Ruta no encontrada */
export function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: `No existe la ruta ${req.method} ${req.originalUrl}` });
}

/**
 * Manejador central de errores. Express 5 envía aquí también los errores
 * de funciones async, sin necesidad de try/catch en cada ruta.
 */
// eslint-disable-next-line no-unused-vars
export function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorApi) {
    return res.status(err.status).json({ error: err.message, detalles: err.detalles });
  }

  // Errores conocidos de Prisma: https://www.prisma.io/docs/orm/reference/error-reference
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un registro con esos datos.', campos: err.meta?.target });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado.' });
    }
  }

  // JSON mal formado en el cuerpo de la petición
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
  }

  console.error(err);
  return res.status(500).json({
    error: 'Error interno del servidor.',
    ...(config.esProduccion ? {} : { detalle: err.message }),
  });
}
