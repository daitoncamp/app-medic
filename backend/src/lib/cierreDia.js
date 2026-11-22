// ==================== CIERRE AUTOMÁTICO DEL DÍA ====================
// Las citas de días anteriores que quedaron abiertas se cierran solas, para
// que la agenda y las estadísticas (inasistencias) reflejen lo que pasó:
//
// - PENDIENTE  → NO_ASISTIO: el paciente nunca llegó.
// - CONFIRMADA → ANULADA con motivo: llegó, pero nadie registró sus signos.
// - PREPARADA  → no se toca: pasó por enfermería y la odontóloga debe finalizarla
//   (le sigue apareciendo en su agenda como "sin finalizar").
//
// Se ejecuta al arrancar el servidor y cada 15 minutos; si no hay nada que
// cerrar no hace nada, así que se puede ejecutar las veces que sea.

import { auditar } from './auditoria.js';
import { hoyLocal, rangoDia } from './fechas.js';
import { prisma } from './prisma.js';

export const MOTIVO_SIN_ATENDER = 'Cierre automático del día: el paciente llegó, pero no se registró su atención.';

const CADA_MINUTOS = 15;

/** db se puede reemplazar en las pruebas por una base en memoria */
export async function cerrarDiasAnteriores({ ahora = new Date(), db = prisma } = {}) {
  const { desde: inicioDeHoy } = rangoDia(hoyLocal(ahora));
  const anteriores = { inicio: { lt: inicioDeHoy } };

  const [pendientes, confirmadas] = await Promise.all([
    db.cita.findMany({ where: { ...anteriores, estado: 'PENDIENTE' }, select: { id: true } }),
    db.cita.findMany({ where: { ...anteriores, estado: 'CONFIRMADA' }, select: { id: true } }),
  ]);
  if (!pendientes.length && !confirmadas.length) return { noAsistieron: 0, sinAtender: 0 };

  // El estado se vuelve a comprobar en el update por si alguien la cambió mientras tanto
  const [noAsistieron, sinAtender] = await db.$transaction([
    db.cita.updateMany({
      where: { id: { in: pendientes.map((c) => c.id) }, estado: 'PENDIENTE' },
      data: { estado: 'NO_ASISTIO' },
    }),
    db.cita.updateMany({
      where: { id: { in: confirmadas.map((c) => c.id) }, estado: 'CONFIRMADA' },
      data: { estado: 'ANULADA', anuladaEn: ahora, motivoAnulacion: MOTIVO_SIN_ATENDER },
    }),
  ]);

  const resultado = { noAsistieron: noAsistieron.count, sinAtender: sinAtender.count };
  await auditar({}, {
    accion: 'ACTUALIZAR',
    entidad: 'CierreDelDia',
    detalle: { ...resultado, citas: [...pendientes, ...confirmadas].map((c) => c.id) },
  }, db);
  console.log(`Cierre del día: ${resultado.noAsistieron} no asistieron, ${resultado.sinAtender} sin atender.`);
  return resultado;
}

/** Ejecuta el cierre ahora y cada 15 minutos. Devuelve una función para detenerlo. */
export function programarCierreDelDia() {
  const ejecutar = () => cerrarDiasAnteriores().catch((error) => {
    console.error('No se pudo hacer el cierre del día:', error.message);
  });
  ejecutar();
  const temporizador = setInterval(ejecutar, CADA_MINUTOS * 60 * 1000);
  temporizador.unref(); // no impide que el proceso termine
  return () => clearInterval(temporizador);
}
