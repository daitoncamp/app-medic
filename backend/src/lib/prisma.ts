// ==================== CLIENTE DE LA BASE DE DATOS ====================
// Una sola instancia para toda la app (cada instancia abre su propio pool de conexiones).
// Desde Prisma 7 la conexión la hace el driver `pg` de Node a través de un adaptador.

import { PrismaClient, type Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/env.ts';

/** Pool de `pg` con los mismos tiempos que usaba Prisma 6 (pg no tiene límite por defecto) */
export const crearAdaptador = (connectionString: string | undefined = process.env.DATABASE_URL) => new PrismaPg({
  connectionString,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 300_000,
});

/** El cliente o el de una transacción ($transaction(async (tx) => …)) */
export type Db = PrismaClient | Prisma.TransactionClient;

export const prisma = new PrismaClient({
  adapter: crearAdaptador(config.databaseUrl),
  log: config.esProduccion ? ['error'] : ['warn', 'error'],
});
