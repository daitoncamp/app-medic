import { describe, expect, it } from 'vitest';
import {
  diasDeSemana, encabezadoDia, inicioSemana, rangoVista, semanasDelMes, sumarDias, sumarMeses, tituloVista,
} from './calendario';

describe('fechas del calendario', () => {
  it('las semanas empiezan el lunes', () => {
    expect(inicioSemana('2026-11-21')).toBe('2026-11-16'); // sábado
    expect(inicioSemana('2026-11-22')).toBe('2026-11-16'); // domingo
    expect(inicioSemana('2026-11-23')).toBe('2026-11-23'); // lunes
    expect(diasDeSemana('2026-11-21')).toEqual([
      '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22',
    ]);
  });

  it('suma días y meses cruzando meses y años', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-01');
    expect(sumarMeses('2026-01-15', -1)).toBe('2025-12-01');
  });

  it('el mes se cubre con semanas completas', () => {
    const semanas = semanasDelMes('2026-11-21');
    expect(semanas).toHaveLength(6);
    expect(semanas[0][0]).toBe('2026-10-26');
    expect(semanas.at(-1)[6]).toBe('2026-12-06');
    semanas.forEach((s) => expect(s).toHaveLength(7));
    expect(rangoVista('mes', '2026-02-10')).toEqual({ desde: '2026-01-26', hasta: '2026-03-01' });
    expect(rangoVista('semana', '2026-11-21')).toEqual({ desde: '2026-11-16', hasta: '2026-11-22' });
  });

  it('títulos en español', () => {
    expect(tituloVista('semana', '2026-11-21')).toBe('16 – 22 nov 2026');
    expect(tituloVista('semana', '2026-12-01')).toBe('30 nov – 6 dic 2026');
    expect(tituloVista('mes', '2026-11-21')).toBe('Noviembre de 2026');
    expect(encabezadoDia('2026-11-21')).toBe('Sáb 21');
  });
});
