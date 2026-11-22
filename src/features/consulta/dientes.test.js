import { describe, expect, it } from 'vitest';
import {
  abreviaturaCara, carasPorPosicion, estadoCara, estadoPrincipal, nombreCara, tipoDiente,
} from './dientes';

describe('dientes (numeración FDI)', () => {
  it('tipo de pieza', () => {
    expect(tipoDiente(11)).toBe('incisivo');
    expect(tipoDiente(13)).toBe('canino');
    expect(tipoDiente(15)).toBe('premolar');
    expect(tipoDiente(16)).toBe('molar');
    expect(tipoDiente(55)).toBe('molar'); // temporal
  });

  it('nombres de las caras según el diente', () => {
    expect(nombreCara('OCLUSAL', 16)).toBe('Oclusal');
    expect(nombreCara('OCLUSAL', 11)).toBe('Incisal');
    expect(nombreCara('LINGUAL', 16)).toBe('Palatino');
    expect(nombreCara('LINGUAL', 46)).toBe('Lingual');
    expect(abreviaturaCara('OCLUSAL', 46)).toBe('O');
  });

  it('mesial queda hacia la línea media y vestibular hacia afuera', () => {
    expect(carasPorPosicion(16)).toMatchObject({ arriba: 'VESTIBULAR', izquierda: 'DISTAL', derecha: 'MESIAL' });
    expect(carasPorPosicion(26)).toMatchObject({ izquierda: 'MESIAL', derecha: 'DISTAL' });
    expect(carasPorPosicion(46)).toMatchObject({ arriba: 'LINGUAL', abajo: 'VESTIBULAR', derecha: 'MESIAL' });
  });

  it('estado de una cara y estado que resume la pieza', () => {
    const marca = { completa: 'caries', caras: { OCLUSAL: 'tratado' } };
    expect(estadoCara(marca, 'OCLUSAL')).toBe('tratado');
    expect(estadoCara(marca, 'MESIAL')).toBe('caries');
    expect(estadoPrincipal(marca)).toBe('caries');
    expect(estadoPrincipal({ completa: null, caras: { OCLUSAL: 'tratado', MESIAL: 'caries' } })).toBe('caries');
    expect(estadoPrincipal(undefined)).toBeNull();
  });
});
