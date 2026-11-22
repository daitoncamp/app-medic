import { describe, expect, it } from 'vitest';
import {
  aInstante, calcularEdad, fechaLocal, horaLocal, hoyLocal, rangoDia, sumarDias,
} from '../src/lib/fechas.ts';

describe('fechas en hora de Ecuador (UTC-5)', () => {
  it('convierte fecha y hora local a instante UTC', () => {
    expect(aInstante('2026-11-21', '09:30').toISOString()).toBe('2026-11-21T14:30:00.000Z');
  });

  it('a las 20:00 en Ecuador sigue siendo el mismo día (en UTC ya es el siguiente)', () => {
    const noche = new Date('2026-11-22T01:00:00Z'); // 20:00 del 21 en Ecuador
    expect(fechaLocal(noche)).toBe('2026-11-21');
    expect(horaLocal(noche)).toBe('20:00');
    expect(hoyLocal(noche)).toBe('2026-11-21');
  });

  it('el rango de un día va de 00:00 a 24:00 de Ecuador', () => {
    const { desde, hasta } = rangoDia('2026-11-21');
    expect(desde.toISOString()).toBe('2026-11-21T05:00:00.000Z');
    expect(hasta.toISOString()).toBe('2026-11-22T05:00:00.000Z');
  });

  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('calcularEdad', () => {
  const nacimiento = new Date('2021-03-14T00:00:00Z');

  it('cuenta años cumplidos y meses totales', () => {
    expect(calcularEdad(nacimiento, new Date('2026-11-21T15:00:00Z'))).toEqual({ anios: 5, meses: 68 });
  });

  it('el día del cumpleaños ya cuenta, el día anterior no', () => {
    expect(calcularEdad(nacimiento, new Date('2026-03-14T15:00:00Z')).anios).toBe(5);
    expect(calcularEdad(nacimiento, new Date('2026-03-13T15:00:00Z')).anios).toBe(4);
  });

  it('usa la fecha de Ecuador, no la de UTC', () => {
    // 13 de marzo a las 21:00 en Ecuador = 14 de marzo en UTC: todavía no cumple
    expect(calcularEdad(nacimiento, new Date('2026-03-14T02:00:00Z')).anios).toBe(4);
  });

  it('en bebés devuelve los meses', () => {
    expect(calcularEdad(new Date('2026-09-01T00:00:00Z'), new Date('2026-11-21T15:00:00Z'))).toEqual({ anios: 0, meses: 2 });
  });
});
