import { describe, expect, it } from 'vitest';
import {
  alertasDeLaToma, cribadoPresionInfantil, evaluarSignosVitales, leerPresion, limiteHipotension,
  mencionaAlergia, rangoPulso, rangoRespiracion, referenciasParaEdad, validarMedicion,
} from './signosVitales.ts';

// Toma normal de un adulto; cada prueba cambia solo lo que evalúa
const NORMAL = { presion: '118/76', pulso: '72', temperatura: '36.5', edad: 30, sexo: 'Femenino' };

const hallazgos = (cambios) => evaluarSignosVitales({ ...NORMAL, ...cambios });
const uno = (cambios) => {
  const lista = hallazgos(cambios);
  expect(lista).toHaveLength(1);
  return lista[0];
};

describe('lectura y digitación', () => {
  it('lee la presión "120/80"', () => {
    expect(leerPresion('120/80')).toEqual({ sistolica: 120, diastolica: 80 });
    expect(leerPresion(' 95/60 ')).toEqual({ sistolica: 95, diastolica: 60 });
    expect(leerPresion('12080')).toBeNull();
  });

  it('acepta una toma completa y válida', () => {
    expect(validarMedicion(NORMAL)).toEqual({});
  });

  it('marca los campos obligatorios vacíos', () => {
    const errores = validarMedicion({ presion: '', pulso: '', temperatura: '' });
    expect(Object.keys(errores).sort()).toEqual(['presion', 'pulso', 'temperatura']);
  });

  it('rechaza valores imposibles (errores de digitación)', () => {
    expect(validarMedicion({ ...NORMAL, presion: '80/90' }).presion).toMatch(/mayor que la diastólica/);
    expect(validarMedicion({ ...NORMAL, presion: '300/90' }).presion).toMatch(/fuera de lo medible/i);
    expect(validarMedicion({ ...NORMAL, pulso: '7.5' }).pulso).toMatch(/entero/);
    expect(validarMedicion({ ...NORMAL, temperatura: '50' }).temperatura).toMatch(/fuera de lo medible/i);
  });

  it('la frecuencia respiratoria y la saturación son opcionales, pero si se escriben se validan', () => {
    expect(validarMedicion({ ...NORMAL, frecuenciaRespiratoria: '', saturacion: '' })).toEqual({});
    const errores = validarMedicion({ ...NORMAL, frecuenciaRespiratoria: '2', saturacion: '101' });
    expect(errores.frecuenciaRespiratoria).toMatch(/fuera de lo medible/i);
    expect(errores.saturacion).toMatch(/fuera de lo medible/i);
  });
});

describe('rangos por edad', () => {
  it('frecuencia cardiaca normal (PALS 2015)', () => {
    expect(rangoPulso(0)).toMatchObject({ min: 100, max: 190 });
    expect(rangoPulso(4)).toMatchObject({ min: 80, max: 120 });
    expect(rangoPulso(30)).toMatchObject({ min: 60, max: 100 });
  });

  it('hipotensión en niños: < 70 + 2 × edad entre 1 y 10 años', () => {
    expect(limiteHipotension(0)).toBe(70);
    expect(limiteHipotension(5)).toBe(80);
    expect(limiteHipotension(15)).toBe(90);
  });

  it('cribado de presión infantil (AAP 2017) solo de 1 a 12 años', () => {
    expect(cribadoPresionInfantil(8, 'Femenino')).toEqual([107, 69]);
    expect(cribadoPresionInfantil(8, 'FEMENINO')).toEqual([107, 69]);
    expect(cribadoPresionInfantil(15, 'Femenino')).toBeNull();
  });

  it('frecuencia respiratoria normal (PALS 2015)', () => {
    expect(rangoRespiracion(0)).toMatchObject({ min: 30, max: 53 });
    expect(rangoRespiracion(2)).toMatchObject({ min: 22, max: 37 });
    expect(rangoRespiracion(4)).toMatchObject({ min: 20, max: 28 });
    expect(rangoRespiracion(9)).toMatchObject({ min: 18, max: 25 });
    expect(rangoRespiracion(40)).toMatchObject({ min: 12, max: 20 });
  });

  it('las referencias que ve enfermería cambian con la edad', () => {
    expect(referenciasParaEdad(4, 'Femenino').pulso).toBe('80-120 lpm');
    expect(referenciasParaEdad(4, 'Femenino').frecuenciaRespiratoria).toBe('20-28 rpm');
    expect(referenciasParaEdad(30, 'Masculino').pulso).toBe('60-100 lpm');
  });
});

describe('presión arterial', () => {
  it('adulto normal: sin alertas', () => {
    expect(hallazgos({})).toEqual([]);
  });

  it('categorías ACC/AHA 2017 en adultos', () => {
    expect(uno({ presion: '125/78' })).toMatchObject({ titulo: 'Presión elevada', severidad: 'moderada' });
    expect(uno({ presion: '120/80' })).toMatchObject({ titulo: 'Hipertensión estadio 1', severidad: 'moderada' });
    expect(uno({ presion: '145/92' })).toMatchObject({ titulo: 'Hipertensión estadio 2', severidad: 'alta' });
    expect(uno({ presion: '185/125' })).toMatchObject({ titulo: 'Crisis hipertensiva', severidad: 'critica' });
  });

  it('hipotensión en adulto y en niño', () => {
    expect(uno({ presion: '85/55' })).toMatchObject({ titulo: 'Hipotensión', severidad: 'critica' });
    expect(uno({ edad: 3, pulso: '100', presion: '70/40' })).toMatchObject({ titulo: 'Hipotensión', severidad: 'critica' });
  });

  it('en niños usa la tabla de la AAP según edad y sexo', () => {
    expect(uno({ edad: 8, pulso: '90', presion: '125/80' })).toMatchObject({ titulo: 'Presión elevada para la edad' });
    expect(hallazgos({ edad: 8, pulso: '90', presion: '100/60' })).toEqual([]);
  });
});

describe('pulso', () => {
  it('detecta taquicardia y bradicardia según la edad', () => {
    expect(uno({ pulso: '125' }).titulo).toBe('Taquicardia');
    expect(uno({ pulso: '45' }).titulo).toBe('Bradicardia');
    // 130 lpm es normal en un lactante, pero taquicardia a los 5 años
    expect(hallazgos({ edad: 0, pulso: '130', presion: '85/50' })).toEqual([]);
    expect(uno({ edad: 5, pulso: '130', presion: '100/60' }).titulo).toBe('Taquicardia');
  });
});

describe('temperatura', () => {
  it('clasifica de hipotermia a hipertermia', () => {
    expect(uno({ temperatura: '34.5' })).toMatchObject({ titulo: 'Hipotermia', severidad: 'critica' });
    expect(uno({ temperatura: '37.6' })).toMatchObject({ titulo: 'Febrícula', severidad: 'moderada' });
    expect(uno({ temperatura: '38.5' })).toMatchObject({ titulo: 'Fiebre' });
    expect(uno({ temperatura: '39.5' })).toMatchObject({ titulo: 'Fiebre alta', severidad: 'alta' });
    expect(uno({ temperatura: '41.5' })).toMatchObject({ titulo: 'Hipertermia', severidad: 'critica' });
  });

  it('acepta coma decimal', () => {
    expect(uno({ temperatura: '38,5' }).titulo).toBe('Fiebre');
  });

  it('la fiebre en un lactante es más importante', () => {
    expect(uno({ edad: 0, pulso: '140', presion: '85/50', temperatura: '38.2' }))
      .toMatchObject({ titulo: 'Fiebre en lactante', severidad: 'alta' });
  });
});

describe('frecuencia respiratoria (opcional)', () => {
  it('no evalúa si no se registró', () => {
    expect(hallazgos({ frecuenciaRespiratoria: '', saturacion: '' })).toEqual([]);
  });

  it('adultos: umbrales de NEWS2', () => {
    expect(hallazgos({ frecuenciaRespiratoria: '16' })).toEqual([]);
    expect(uno({ frecuenciaRespiratoria: '8' })).toMatchObject({ titulo: 'Bradipnea grave', severidad: 'critica' });
    expect(uno({ frecuenciaRespiratoria: '10' })).toMatchObject({ severidad: 'moderada' });
    expect(uno({ frecuenciaRespiratoria: '22' })).toMatchObject({ titulo: 'Taquipnea', severidad: 'alta' });
    expect(uno({ frecuenciaRespiratoria: '26' })).toMatchObject({ titulo: 'Taquipnea grave', severidad: 'critica' });
  });

  it('menores de 5 años: respiración rápida según la OMS (usa la edad en meses)', () => {
    const lactante = { edad: 0, pulso: '140', presion: '85/50' };
    expect(uno({ ...lactante, edadMeses: 1, frecuenciaRespiratoria: '62' }).titulo).toBe('Respiración rápida');
    expect(uno({ ...lactante, edadMeses: 6, frecuenciaRespiratoria: '52' }).titulo).toBe('Respiración rápida');
    const preescolar = { edad: 3, edadMeses: 40, pulso: '100', presion: '95/55' };
    expect(uno({ ...preescolar, frecuenciaRespiratoria: '35' })).toMatchObject({ titulo: 'Taquipnea', severidad: 'moderada' });
    expect(uno({ ...preescolar, frecuenciaRespiratoria: '42' })).toMatchObject({ titulo: 'Respiración rápida', severidad: 'alta' });
  });

  it('niños: menos de 10 rpm es bradipnea', () => {
    const escolar = { edad: 8, pulso: '90', presion: '100/60' };
    expect(uno({ ...escolar, frecuenciaRespiratoria: '15' }).severidad).toBe('moderada');
    expect(uno({ ...escolar, frecuenciaRespiratoria: '8' })).toMatchObject({ titulo: 'Bradipnea', severidad: 'alta' });
  });
});

describe('saturación de oxígeno (opcional, NEWS2 escala 1)', () => {
  it('clasifica por umbrales', () => {
    expect(hallazgos({ saturacion: '98' })).toEqual([]);
    expect(uno({ saturacion: '95' }).severidad).toBe('moderada');
    expect(uno({ saturacion: '93' })).toMatchObject({ titulo: 'Hipoxemia', severidad: 'alta' });
    expect(uno({ saturacion: '91' })).toMatchObject({ titulo: 'Hipoxemia grave', severidad: 'critica' });
  });
});

describe('orden y alertas guardadas', () => {
  it('ordena de la más a la menos urgente', () => {
    const severidades = hallazgos({ presion: '125/78', temperatura: '41.5', pulso: '125' }).map((h) => h.severidad);
    expect(severidades).toEqual(['critica', 'alta', 'moderada']);
  });

  it('las alertas de la toma incluyen la alergia mencionada en observaciones', () => {
    const alertas = alertasDeLaToma({ ...NORMAL, temperatura: '38.5', observaciones: 'Alérgica a la penicilina' });
    expect(alertas.map((a) => a.tipo)).toEqual(['signos', 'alergia']);
    expect(alertas[1]).toMatchObject({ titulo: 'Alergia', descripcion: 'Alérgica a la penicilina' });
  });

  it('las frases que niegan una alergia no crean alerta', () => {
    expect(mencionaAlergia('Alérgico a AINES')).toBe(true);
    expect(mencionaAlergia('Madre refiere alergia a amoxicilina')).toBe(true);
    expect(mencionaAlergia('Niega alergias')).toBe(false);
    expect(mencionaAlergia('Sin alergias conocidas')).toBe(false);
    expect(mencionaAlergia('No refiere alergias')).toBe(false);
    expect(mencionaAlergia('Ningún tipo de alergia')).toBe(false);
    expect(mencionaAlergia('Niega alergias. Alérgico al látex')).toBe(true);
    expect(mencionaAlergia('')).toBe(false);
  });
});
