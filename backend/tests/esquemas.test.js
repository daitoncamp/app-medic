import { describe, expect, it } from 'vitest';
import {
  esPiezaFDI, esquemaCedula, esquemaPaciente, esquemaPiezas, esquemaProcedimiento, esquemaTipoCita,
} from '../src/lib/esquemas.js';

const PACIENTE = {
  cedula: '1312345678', nombres: 'Ana', apellidos: 'Vera', fechaNacimiento: '1990-01-01', sexo: 'FEMENINO', telefono: '0991234567',
};

const error = (esquema, valor) => {
  const r = esquema.safeParse(valor);
  return r.success ? null : r.error.issues[0].message;
};

describe('validación en el servidor', () => {
  it('cédula: 10 dígitos y provincia válida', () => {
    expect(esquemaCedula.safeParse('1312345678').success).toBe(true);
    expect(error(esquemaCedula, '2512345678')).toBeTruthy();
    expect(error(esquemaCedula, '13123')).toBeTruthy();
  });

  it('paciente: los opcionales que no vienen no se tocan; si vienen vacíos se borran', () => {
    const sinOpcionales = esquemaPaciente.parse(PACIENTE);
    expect(sinOpcionales.correo).toBeUndefined();
    expect(sinOpcionales.contactoEmergenciaNombre).toBeUndefined();

    const vacios = esquemaPaciente.parse({ ...PACIENTE, correo: '', contactoEmergenciaTelefono: '' });
    expect(vacios.correo).toBeNull();
    expect(vacios.contactoEmergenciaTelefono).toBeNull();

    expect(esquemaPaciente.parse({ ...PACIENTE, correo: 'ANA@Mail.com' }).correo).toBe('ana@mail.com');
  });

  it('paciente: rechaza teléfonos y fechas inválidos', () => {
    expect(error(esquemaPaciente, { ...PACIENTE, telefono: '12345' })).toMatch(/09xxxxxxxx/);
    expect(error(esquemaPaciente, { ...PACIENTE, contactoEmergenciaTelefono: '12' })).toMatch(/Teléfono inválido/);
    expect(error(esquemaPaciente, { ...PACIENTE, fechaNacimiento: '2999-01-01' })).toBeTruthy();
  });

  it('piezas dentales en numeración FDI', () => {
    expect(esPiezaFDI(11)).toBe(true);
    expect(esPiezaFDI(48)).toBe(true);
    expect(esPiezaFDI(85)).toBe(true);
    expect(esPiezaFDI(19)).toBe(false);
    expect(esPiezaFDI(56)).toBe(false);
    expect(esquemaPiezas.parse('16, 26, 16')).toEqual([16, 26]);
    expect(esquemaPiezas.parse([11, '85'])).toEqual([11, 85]);
    expect(error(esquemaPiezas, '19')).toMatch(/Pieza inválida: 19/);
    expect(error(esquemaPiezas, '')).toMatch(/al menos una pieza/);
  });

  it('procedimientos y tipos de cita: acepta nombres antiguos y los convierte', () => {
    expect(esquemaProcedimiento.parse('Resina')).toBe('Restauración con resina');
    expect(esquemaTipoCita.parse('Limpieza dental')).toBe('Limpieza');
    expect(esquemaTipoCita.parse('Urgencia')).toBe('Urgencia');
    expect(error(esquemaProcedimiento, 'Urgencia')).toMatch(/procedimiento de la lista/);
    expect(error(esquemaTipoCita, 'Inventado')).toMatch(/tipo de consulta/);
  });
});
