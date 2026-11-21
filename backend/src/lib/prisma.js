// ==================== CLIENTE DE LA BASE DE DATOS ====================
// Una sola instancia para toda la app (cada instancia abre su propio pool de conexiones).

import { PrismaClient } from '@prisma/client';
import { config } from '../config/env.js';

export const prisma = new PrismaClient({
  log: config.esProduccion ? ['error'] : ['warn', 'error'],
});
