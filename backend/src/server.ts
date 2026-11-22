import { app } from './app.ts';
import { config } from './config/env.ts';
import { programarCierreDelDia } from './lib/cierreDia.ts';
import { prisma } from './lib/prisma.ts';

const servidor = app.listen(config.puerto, () => {
  console.log(`API de la clínica escuchando en http://localhost:${config.puerto}`);
  console.log(`Prueba: http://localhost:${config.puerto}/api/salud`);
  // Las citas de días anteriores que quedaron abiertas se cierran solas
  programarCierreDelDia();
});

// Cierre ordenado: termina las peticiones en curso y cierra la base de datos
const cerrar = async (senal: NodeJS.Signals) => {
  console.log(`\n${senal} recibido, cerrando…`);
  servidor.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
