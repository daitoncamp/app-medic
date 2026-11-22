import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Valores de relleno para poder importar la configuración sin un .env.
    // Las pruebas de integración (RUN_API_TESTS=1) usan el DATABASE_URL real del entorno.
    env: {
      JWT_SECRET: process.env.JWT_SECRET || 'clave-solo-para-pruebas-0123456789-abcdefghij',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://pruebas:pruebas@localhost:5432/pruebas',
    },
    // La prueba de integración modifica la base de datos: un archivo a la vez
    fileParallelism: false,
  },
});
