// ==================== CONFIGURACIÓN DE PRISMA 7 ====================
// Desde Prisma 7 la dirección de la base, las migraciones y el seed se configuran aquí
// (antes estaban en schema.prisma y package.json). Prisma ya no lee el .env solo.

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
