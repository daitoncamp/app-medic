import { app } from './app.js';
import { config } from './config/env.js';
import { programarCierreDelDia } from './lib/cierreDia.js';
import { prisma } from './lib/prisma.js';

const servidor = app.listen(config.puerto, () => {
  console.log(`API de la clínica escuchando en http://localhost:${config.puerto}`);
  console.log(`Prueba: http://localhost:${config.puerto}/api/salud`);
  // Las citas de días anteriores que quedaron abiertas se cierran solas
  programarCierreDelDia();
});

// Cierre ordenado: termina las peticiones en curso y cierra la base de datos
const cerrar = async (senal) => {
  console.log(`\n${senal} recibido, cerrando…`);
  servidor.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
