import { describe, expect, it } from 'vitest';
import {
  enlaceSMS, enlaceWhatsApp, LIMITE_SMS, mensajeRecordatorio, mensajeSMS,
} from './recordatoriosApi';

const cita = (cambios = {}) => ({
  fecha: '2026-11-22',
  hora: '10:00',
  consulta: 'Control',
  paciente: 'Mateo Andrés Vera Zambrano',
  edad: 5,
  datosPaciente: { nombres: 'Mateo Andrés', apellidos: 'Vera Zambrano' },
  ...cambios,
});

describe('mensajes de recordatorio', () => {
  it('WhatsApp: a un menor de edad se le escribe al representante', () => {
    expect(mensajeRecordatorio(cita())).toMatch(/^Hola, le recordamos la cita de Mateo Andrés Vera Zambrano de control/);
    expect(mensajeRecordatorio(cita({ edad: 36 }))).toMatch(/^Hola, Mateo Andrés\. Le recordamos su cita/);
  });

  it('SMS: cabe en un solo mensaje y va sin tildes', () => {
    const largos = [
      cita(),
      cita({ consulta: 'Restauración con ionómero de vidrio', datosPaciente: { nombres: 'María José', apellidos: 'Macías Cedeño' } }),
      cita({ consulta: 'Raspado y alisado radicular', datosPaciente: { nombres: 'Maximiliano Alejandro', apellidos: 'Zambrano Bermúdez' } }),
    ];
    largos.forEach((c) => {
      const texto = mensajeSMS(c);
      expect(texto.length).toBeLessThanOrEqual(LIMITE_SMS);
      expect(texto).not.toMatch(/[áéíóúÁÉÍÓÚ]/);
      expect(texto).toMatch(/responda este SMS/); // el aviso para reprogramar siempre va
    });
    expect(mensajeSMS(cita())).toMatch(/^Clinica Odontologica ULEAM: Mateo Vera tiene cita de control/);
  });

  it('enlaces con el número en formato internacional de Ecuador', () => {
    expect(enlaceWhatsApp('0991234567', 'Hola')).toBe('https://wa.me/593991234567?text=Hola');
    expect(enlaceSMS('0991234567', 'Hola mundo')).toMatch(/^sms:\+593991234567[?&]body=Hola%20mundo$/);
  });
});
