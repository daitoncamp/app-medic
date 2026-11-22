import { describe, expect, it } from 'vitest';
import {
  reglasPaciente, validarCedula, validarEmail, validarFechaNacimiento, validarFormulario, validarNombre,
  validarPasswordNueva, validarTelefono,
} from './validaciones';

describe('validaciones de formularios', () => {
  it('cédula: 10 dígitos y provincia válida (01-24 o 30)', () => {
    expect(validarCedula('1312345678')).toBe('');
    expect(validarCedula('3012345678')).toBe('');
    expect(validarCedula('131234567')).toMatch(/10 dígitos/);
    expect(validarCedula('13123456ab')).toMatch(/10 dígitos/);
    expect(validarCedula('2512345678')).toMatch(/provincia/);
    expect(validarCedula('0012345678')).toMatch(/provincia/);
  });

  it('teléfono celular y correo', () => {
    expect(validarTelefono('0991234567')).toBe('');
    expect(validarTelefono('0891234567')).not.toBe('');
    expect(validarTelefono('099123456')).not.toBe('');
    expect(validarEmail('ana@mail.com')).toBe('');
    expect(validarEmail('ana@')).not.toBe('');
  });

  it('nombre completo (contacto de emergencia)', () => {
    expect(validarNombre('María Pico')).toBe('');
    expect(validarNombre('María')).toMatch(/nombre y apellido/);
    expect(validarNombre('María P3')).toMatch(/letras/);
  });

  it('fecha de nacimiento: no futura ni de hace más de 120 años', () => {
    expect(validarFechaNacimiento('1990-05-10')).toBe('');
    expect(validarFechaNacimiento(`${new Date().getFullYear() + 1}-01-01`)).toMatch(/futura/);
    expect(validarFechaNacimiento('1850-01-01')).toMatch(/año/);
    expect(validarFechaNacimiento('no-es-fecha')).toMatch(/inválida/);
  });

  it('contraseña nueva: mismas reglas que el servidor', () => {
    expect(validarPasswordNueva('Clinica2026!')).toBe('');
    expect(validarPasswordNueva('corta1')).toMatch(/8 caracteres/);
    expect(validarPasswordNueva('sinnumeros')).toMatch(/número/);
    expect(validarPasswordNueva('12345678')).toMatch(/letra/);
  });

  it('formulario de paciente: correo y contacto de emergencia son opcionales', () => {
    const paciente = {
      cedula: '1312345678', nombres: 'Mateo', apellidos: 'Vera', fechaNacimiento: '2021-03-14',
      sexo: 'Masculino', telefono: '0991234567', correo: '', contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '',
    };
    expect(validarFormulario(paciente, reglasPaciente)).toEqual({});
    const errores = validarFormulario({ ...paciente, cedula: '', contactoEmergenciaTelefono: '12' }, reglasPaciente);
    expect(Object.keys(errores).sort()).toEqual(['cedula', 'contactoEmergenciaTelefono']);
  });
});
