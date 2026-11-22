import { beforeEach, describe, expect, it } from 'vitest';
import { cerrarDiasAnteriores, MOTIVO_SIN_ATENDER } from '../src/lib/cierreDia.js';

// Base de datos en memoria con lo mínimo que usa el cierre del día
function baseEnMemoria(citas) {
  const auditoria = [];
  const coincide = (c, where) => Object.entries(where).every(([campo, valor]) => {
    if (campo === 'id') return valor.in.includes(c.id);
    if (campo === 'inicio') return c.inicio < valor.lt;
    return c[campo] === valor;
  });
  const db = {
    auditoria: { create: async ({ data }) => auditoria.push(data) },
    cita: {
      findMany: async ({ where }) => citas.filter((c) => coincide(c, where)).map((c) => ({ id: c.id })),
      updateMany: ({ where, data }) => () => {
        const afectadas = citas.filter((c) => coincide(c, where));
        afectadas.forEach((c) => Object.assign(c, data));
        return { count: afectadas.length };
      },
    },
    $transaction: async (operaciones) => operaciones.map((op) => op()),
  };
  return { db, auditoria };
}

const AHORA = new Date('2026-11-21T15:00:00Z'); // 21 nov, 10:00 en Ecuador
const cita = (id, inicio, estado) => ({ id, inicio: new Date(inicio), estado });

describe('cierre automático del día', () => {
  let citas;
  beforeEach(() => {
    citas = [
      cita('pendiente-ayer', '2026-11-20T15:00:00Z', 'PENDIENTE'),
      cita('pendiente-ayer-noche', '2026-11-21T04:30:00Z', 'PENDIENTE'), // 23:30 del 20 en Ecuador
      cita('confirmada-ayer', '2026-11-20T16:00:00Z', 'CONFIRMADA'),
      cita('preparada-ayer', '2026-11-20T17:00:00Z', 'PREPARADA'),
      cita('atendida-ayer', '2026-11-20T18:00:00Z', 'ATENDIDA'),
      cita('pendiente-hoy', '2026-11-21T13:00:00Z', 'PENDIENTE'), // 08:00 de hoy
    ];
  });

  it('cierra solo las citas abiertas de días anteriores', async () => {
    const { db, auditoria } = baseEnMemoria(citas);
    expect(await cerrarDiasAnteriores({ ahora: AHORA, db })).toEqual({ noAsistieron: 2, sinAtender: 1 });

    const estado = Object.fromEntries(citas.map((c) => [c.id, c.estado]));
    expect(estado).toEqual({
      'pendiente-ayer': 'NO_ASISTIO',
      'pendiente-ayer-noche': 'NO_ASISTIO',
      'confirmada-ayer': 'ANULADA',
      'preparada-ayer': 'PREPARADA', // la odontóloga debe finalizarla
      'atendida-ayer': 'ATENDIDA',
      'pendiente-hoy': 'PENDIENTE',
    });
    expect(citas.find((c) => c.id === 'confirmada-ayer').motivoAnulacion).toBe(MOTIVO_SIN_ATENDER);
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]).toMatchObject({ entidad: 'CierreDelDia', detalle: { noAsistieron: 2, sinAtender: 1 } });
  });

  it('se puede ejecutar varias veces sin repetir cambios ni auditorías', async () => {
    const { db, auditoria } = baseEnMemoria(citas);
    await cerrarDiasAnteriores({ ahora: AHORA, db });
    expect(await cerrarDiasAnteriores({ ahora: AHORA, db })).toEqual({ noAsistieron: 0, sinAtender: 0 });
    expect(auditoria).toHaveLength(1);
  });
});
