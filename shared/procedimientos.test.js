import { describe, expect, it } from 'vitest';
import {
  PROCEDIMIENTOS_CON_CONSENTIMIENTO, PLANTILLAS, requiereConsentimiento, textoConsentimiento,
} from './consentimientos.js';
import {
  agruparPorGrupo, buscarProcedimiento, NOMBRES_PROCEDIMIENTOS, NOMBRES_TIPOS_CITA,
  normalizarProcedimiento, procedimientoParaCita, PROCEDIMIENTOS, TIPOS_CITA,
} from './procedimientos.js';

describe('catálogo de procedimientos', () => {
  it('no tiene nombres repetidos', () => {
    expect(new Set(NOMBRES_PROCEDIMIENTOS).size).toBe(NOMBRES_PROCEDIMIENTOS.length);
    expect(new Set(NOMBRES_TIPOS_CITA).size).toBe(NOMBRES_TIPOS_CITA.length);
  });

  it('los tipos de cita incluyen los motivos generales y todos los procedimientos', () => {
    ['Revisión', 'Urgencia', 'Control'].forEach((t) => expect(NOMBRES_TIPOS_CITA).toContain(t));
    NOMBRES_PROCEDIMIENTOS.forEach((p) => expect(NOMBRES_TIPOS_CITA).toContain(p));
  });

  it('agrupa en el orden del catálogo', () => {
    const grupos = agruparPorGrupo(TIPOS_CITA).map((g) => g.grupo);
    expect(grupos[0]).toBe('General');
    expect(grupos).toContain('Endodoncia');
    expect(agruparPorGrupo(PROCEDIMIENTOS).reduce((n, g) => n + g.items.length, 0)).toBe(PROCEDIMIENTOS.length);
  });

  it('acepta los nombres de versiones anteriores', () => {
    expect(normalizarProcedimiento('Resina')).toBe('Restauración con resina');
    expect(normalizarProcedimiento('Limpieza dental')).toBe('Limpieza');
    expect(normalizarProcedimiento('Extracción')).toBe('Extracción');
    expect(buscarProcedimiento('Resina')?.grupo).toBe('Restauración');
  });

  it('sugiere el procedimiento según el tipo de cita', () => {
    expect(procedimientoParaCita('Extracción')).toBe('Extracción');
    expect(procedimientoParaCita('Limpieza dental')).toBe('Limpieza');
    expect(procedimientoParaCita('Urgencia')).toBe('Revisión');
    expect(procedimientoParaCita('Control')).toBe('Revisión');
  });
});

describe('consentimiento informado', () => {
  it('cada procedimiento que lo requiere tiene una plantilla con riesgos y alternativas', () => {
    expect(PROCEDIMIENTOS_CON_CONSENTIMIENTO.length).toBeGreaterThan(0);
    PROCEDIMIENTOS_CON_CONSENTIMIENTO.forEach((nombre) => {
      const plantilla = PLANTILLAS[buscarProcedimiento(nombre).plantilla];
      expect(plantilla).toBeDefined();
      expect(plantilla.riesgos.length).toBeGreaterThan(0);
      expect(plantilla.alternativas.length).toBeGreaterThan(10);
    });
  });

  it('los procedimientos preventivos no lo requieren', () => {
    ['Revisión', 'Limpieza', 'Aplicación de flúor', 'Sellantes', 'Detartraje', 'Prótesis removible']
      .forEach((p) => expect(requiereConsentimiento(p)).toBe(false));
    expect(requiereConsentimiento('Extracción')).toBe(true);
    expect(requiereConsentimiento('Resina')).toBe(true); // nombre antiguo
  });

  it('el texto nombra al paciente, al procedimiento y el derecho a revocar', () => {
    const texto = textoConsentimiento({
      procedimiento: 'Extracción',
      paciente: { nombre: 'Luis Pico', cedula: '1305556667' },
      firmante: {},
      esRepresentante: false,
      odontologo: 'Dra. Ana Vera',
    });
    expect(texto).toMatch(/^Yo, Luis Pico, con cédula 1305556667/);
    expect(texto).toMatch(/Dra\. Ana Vera/);
    expect(texto).toMatch(/retirar este consentimiento/);
    expect(texto).toMatch(/autorizo que se realice el procedimiento de extracción/);
  });

  it('si firma un representante, lo identifica con su parentesco', () => {
    const texto = textoConsentimiento({
      procedimiento: 'Pulpotomía',
      paciente: { nombre: 'Mateo Vera', cedula: '1312345678' },
      firmante: { nombre: 'Ana Zambrano', cedula: '1714616123', parentesco: 'Madre' },
      esRepresentante: true,
    });
    expect(texto).toMatch(/^Yo, Ana Zambrano, con cédula 1714616123, en calidad de madre de Mateo Vera/);
  });

  it('un procedimiento sin consentimiento no genera texto', () => {
    expect(textoConsentimiento({ procedimiento: 'Limpieza', paciente: {}, firmante: {} })).toBe('');
  });
});
