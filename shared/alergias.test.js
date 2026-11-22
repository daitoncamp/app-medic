import { describe, expect, it } from 'vitest';
import { coincidenciaAlergia, revisarReceta } from './alergias.js';

describe('coincidenciaAlergia', () => {
  it('detecta el mismo medicamento, sin importar tildes ni mayúsculas', () => {
    expect(coincidenciaAlergia('Amoxicilina', ['Madre refiere alergia a amoxicilina'])).toBe('Madre refiere alergia a amoxicilina');
    expect(coincidenciaAlergia('Lidocaína', ['alergia a anestesia local lidocaina'])).toBeTruthy();
  });

  it('detecta medicamentos del mismo grupo (reactividad cruzada)', () => {
    expect(coincidenciaAlergia('Amoxicilina', ['Alergia a la penicilina'])).toBe('Alergia a la penicilina');
    expect(coincidenciaAlergia('Ibuprofeno', ['Alérgico a AINES'])).toBe('Alérgico a AINES');
    expect(coincidenciaAlergia('Ketorolaco', ['aspirina'])).toBe('aspirina');
    expect(coincidenciaAlergia('Cefalexina', ['cefalosporinas'])).toBeTruthy();
  });

  it('no avisa cuando no hay relación', () => {
    expect(coincidenciaAlergia('Paracetamol', ['Alergia a la penicilina'])).toBeNull();
    expect(coincidenciaAlergia('Ibuprofeno', ['Ninguna'])).toBeNull();
    expect(coincidenciaAlergia('Ibuprofeno', [])).toBeNull();
    expect(coincidenciaAlergia('', ['Penicilina'])).toBeNull();
  });

  it('las formas farmacéuticas no cuentan como coincidencia', () => {
    // "enjuague" o "jarabe" no identifican al medicamento
    expect(coincidenciaAlergia('Clorhexidina enjuague', ['Enjuague bucal con alcohol'])).toBeNull();
    expect(coincidenciaAlergia('Paracetamol jarabe', ['jarabe de amoxicilina'])).toBeNull();
  });
});

describe('revisarReceta', () => {
  it('devuelve solo los medicamentos con posible alergia, con su posición', () => {
    const receta = [{ medicamento: 'Paracetamol' }, { medicamento: 'Amoxicilina' }, { medicamento: 'Ibuprofeno' }];
    expect(revisarReceta(receta, ['Penicilina (urticaria)'])).toEqual([
      { indice: 1, medicamento: 'Amoxicilina', alergia: 'Penicilina (urticaria)' },
    ]);
  });
});
