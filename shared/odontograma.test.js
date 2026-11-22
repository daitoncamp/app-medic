import { describe, expect, it } from 'vitest';
import { combinarOdontograma, estadosDePieza, resumirMarcas } from './odontograma.js';

const marca = (pieza, cara, estado) => ({ pieza, cara, estado });

describe('resumirMarcas', () => {
  it('agrupa las caras de cada pieza', () => {
    expect(resumirMarcas([marca(16, 'OCLUSAL', 'CARIES'), marca(16, 'MESIAL', 'CARIES')]))
      .toEqual({ 16: { completa: null, caras: { OCLUSAL: 'CARIES', MESIAL: 'CARIES' } } });
  });

  it('un diente completo más reciente reemplaza a las caras anteriores', () => {
    expect(resumirMarcas([marca(16, 'OCLUSAL', 'CARIES'), marca(16, 'COMPLETA', 'TRATADO')]))
      .toEqual({ 16: { completa: 'TRATADO', caras: {} } });
  });

  it('una cara marcada después se suma al diente completo', () => {
    expect(resumirMarcas([marca(46, 'COMPLETA', 'CARIES'), marca(46, 'OCLUSAL', 'TRATADO')]))
      .toEqual({ 46: { completa: 'CARIES', caras: { OCLUSAL: 'TRATADO' } } });
  });

  it('una cara marcada sobre una pieza ausente indica que está presente', () => {
    expect(resumirMarcas([marca(18, 'COMPLETA', 'AUSENTE'), marca(18, 'OCLUSAL', 'SANO')]))
      .toEqual({ 18: { completa: null, caras: { OCLUSAL: 'SANO' } } });
  });
});

describe('combinarOdontograma (visitas anteriores + hoy)', () => {
  const anterior = {
    16: { completa: 'TRATADO', caras: {} },
    18: { completa: 'AUSENTE', caras: {} },
    46: { completa: 'CARIES', caras: { OCLUSAL: 'TRATADO' } },
  };

  it('sin marcas de hoy, queda igual', () => {
    expect(combinarOdontograma(anterior, {})).toEqual(anterior);
  });

  it('el diente completo de hoy reemplaza lo anterior', () => {
    expect(combinarOdontograma(anterior, { 46: { completa: 'AUSENTE', caras: {} } })[46])
      .toEqual({ completa: 'AUSENTE', caras: {} });
  });

  it('las caras de hoy se suman a las anteriores', () => {
    expect(combinarOdontograma(anterior, { 46: { completa: null, caras: { MESIAL: 'CARIES' } } })[46])
      .toEqual({ completa: 'CARIES', caras: { OCLUSAL: 'TRATADO', MESIAL: 'CARIES' } });
  });

  it('una pieza nueva aparece', () => {
    expect(combinarOdontograma(anterior, { 26: { completa: null, caras: { DISTAL: 'CARIES' } } })[26])
      .toEqual({ completa: null, caras: { DISTAL: 'CARIES' } });
  });
});

describe('estadosDePieza', () => {
  it('lista los estados sin repetir', () => {
    expect(estadosDePieza({ completa: 'caries', caras: { OCLUSAL: 'tratado', MESIAL: 'caries' } })).toEqual(['caries', 'tratado']);
    expect(estadosDePieza(undefined)).toEqual([]);
  });
});
