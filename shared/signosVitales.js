// ==================== EVALUACIÓN DE SIGNOS VITALES SEGÚN LA EDAD ====================
// Código compartido: lo usan el frontend (vista previa mientras enfermería escribe)
// y el backend (que es quien guarda las alertas). Así las dos partes aplican
// exactamente los mismos rangos. Debe quedarse sin dependencias.
//
// Son alertas de apoyo para el personal, no un diagnóstico. Referencias:
// - Frecuencia cardiaca en niños (despierto): PALS 2015 (American Heart Association).
// - Hipotensión en niños: PALS → < 60 (neonato), < 70 (lactante),
//   < 70 + 2 × edad (1-10 años), < 90 (mayores de 10 años).
// - Presión alta en niños de 1 a 12 años: tabla de cribado de la AAP 2017
//   (Flynn et al., Pediatrics 140(3):e20171904). Valores por encima requieren evaluación.
// - Presión en adolescentes (13+) y adultos: categorías ACC/AHA 2017.
// - Temperatura: hipotermia < 35 °C; febrícula, fiebre, fiebre alta e hipertermia (> 41 °C)
//   según la clasificación de StatPearls (NCBI).
// - Frecuencia respiratoria en niños: rangos normales PALS 2015 y "respiración rápida"
//   de la OMS en menores de 5 años (> 60 hasta 2 meses, > 50 de 2 a 12 meses, > 40 de 1 a 5 años).
//   En cualquier niño, menos de 10 o más de 60 rpm es anormal (PALS).
// - Frecuencia respiratoria en adultos (16+) y saturación de oxígeno: umbrales de NEWS2
//   (Royal College of Physicians, 2017), escala 1 de SpO2.
//
// La frecuencia respiratoria y la saturación son opcionales: se evalúan si se registran.
// La edad (en años cumplidos) se calcula con la fecha de nacimiento del paciente.

export const SEVERIDAD = Object.freeze({
  CRITICA: 'critica',
  ALTA: 'alta',
  MODERADA: 'moderada',
});

export const TEXTO_SEVERIDAD = {
  critica: 'Urgente',
  alta: 'Importante',
  moderada: 'Vigilar',
};

// Límites de lo que se puede medir: fuera de esto casi seguro es un error de digitación
export const LIMITES_MEDIBLES = {
  sistolica: [50, 260],
  diastolica: [30, 160],
  pulso: [30, 250],
  temperatura: [30, 44],
  frecuenciaRespiratoria: [4, 90],
  saturacion: [50, 100],
};

// ===== Frecuencia respiratoria normal (PALS 2015) =====
const RANGOS_RESPIRACION = [
  { hasta: 0, min: 30, max: 53, grupo: 'lactante (menos de 1 año)' },
  { hasta: 2, min: 22, max: 37, grupo: 'niño de 1 a 2 años' },
  { hasta: 5, min: 20, max: 28, grupo: 'preescolar (3 a 5 años)' },
  { hasta: 11, min: 18, max: 25, grupo: 'escolar (6 a 11 años)' },
  { hasta: 15, min: 12, max: 20, grupo: 'adolescente (12 a 15 años)' },
  { hasta: Infinity, min: 12, max: 20, grupo: 'adulto' },
];

export const rangoRespiracion = (edad) => {
  const e = aNumeroEdad(edad) ?? 30;
  return RANGOS_RESPIRACION.find((r) => e <= r.hasta);
};

/** Umbral de "respiración rápida" de la OMS (solo menores de 5 años) */
const respiracionRapidaOMS = (edadMeses) => {
  if (edadMeses === null || edadMeses === undefined || edadMeses >= 60) return null;
  if (edadMeses < 2) return 60;
  if (edadMeses < 12) return 50;
  return 40;
};

// ===== Frecuencia cardiaca normal en reposo (PALS 2015, despierto) =====
const RANGOS_PULSO = [
  { hasta: 0, min: 100, max: 190, grupo: 'lactante (menos de 1 año)' },
  { hasta: 2, min: 98, max: 140, grupo: 'niño pequeño (1-2 años)' },
  { hasta: 5, min: 80, max: 120, grupo: 'preescolar (3-5 años)' },
  { hasta: 11, min: 75, max: 118, grupo: 'escolar (6-11 años)' },
  { hasta: 15, min: 60, max: 100, grupo: 'adolescente (12-15 años)' },
  { hasta: Infinity, min: 60, max: 100, grupo: 'adulto' },
];

// ===== Presión que requiere evaluación en niños (AAP 2017, tabla de cribado) =====
// [sistólica, diastólica] para niños y niñas de 1 a 12 años
const CRIBADO_PRESION = {
  1: { M: [98, 52], F: [98, 54] },
  2: { M: [100, 55], F: [101, 58] },
  3: { M: [101, 58], F: [102, 60] },
  4: { M: [102, 60], F: [103, 62] },
  5: { M: [103, 63], F: [104, 64] },
  6: { M: [105, 66], F: [105, 67] },
  7: { M: [106, 68], F: [106, 68] },
  8: { M: [107, 69], F: [107, 69] },
  9: { M: [107, 70], F: [108, 71] },
  10: { M: [108, 72], F: [109, 72] },
  11: { M: [110, 74], F: [111, 74] },
  12: { M: [113, 75], F: [114, 75] },
};

const aNumeroEdad = (edad) => {
  if (edad === null || edad === undefined || String(edad).trim() === '') return null;
  const n = Number(edad);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
};

export const rangoPulso = (edad) => {
  const e = aNumeroEdad(edad) ?? 18;
  return RANGOS_PULSO.find((r) => e <= r.hasta);
};

/** Presión sistólica por debajo de la cual hay hipotensión (PALS / adultos) */
export const limiteHipotension = (edad) => {
  const e = aNumeroEdad(edad) ?? 18;
  if (e < 1) return 70;
  if (e <= 10) return 70 + 2 * e;
  return 90;
};

/** Valores de cribado de presión alta para niños de 1 a 12 años */
export const cribadoPresionInfantil = (edad, sexo) => {
  const e = aNumeroEdad(edad);
  if (e === null || e < 1 || e > 12) return null;
  // Acepta 'Femenino' (pantallas) o 'FEMENINO' (base de datos)
  return CRIBADO_PRESION[e][/^f/i.test(String(sexo ?? '')) ? 'F' : 'M'];
};

/** "120/80" → { sistolica: 120, diastolica: 80 } */
export const leerPresion = (texto) => {
  const m = /^(\d{2,3})\/(\d{2,3})$/.exec(String(texto).trim());
  return m ? { sistolica: Number(m[1]), diastolica: Number(m[2]) } : null;
};

const numero = (valor) => {
  const n = parseFloat(String(valor).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// ==================== VALIDACIÓN DE DIGITACIÓN ====================

/**
 * Revisa que los valores sean medibles (no que sean normales: un valor anormal
 * es válido y genera una alerta). Devuelve { campo: mensaje }.
 */
export function validarMedicion({ presion, pulso, temperatura, frecuenciaRespiratoria, saturacion }) {
  const errores = {};
  const p = leerPresion(presion);
  if (!String(presion).trim()) errores.presion = 'La presión arterial es obligatoria.';
  else if (!p) errores.presion = 'Formato incorrecto (ej.: 120/80).';
  else if (p.sistolica <= p.diastolica) errores.presion = 'La sistólica (primer número) debe ser mayor que la diastólica.';
  else if (p.sistolica < LIMITES_MEDIBLES.sistolica[0] || p.sistolica > LIMITES_MEDIBLES.sistolica[1]) {
    errores.presion = `Sistólica fuera de lo medible (${LIMITES_MEDIBLES.sistolica.join('-')}). Revise el valor.`;
  } else if (p.diastolica < LIMITES_MEDIBLES.diastolica[0] || p.diastolica > LIMITES_MEDIBLES.diastolica[1]) {
    errores.presion = `Diastólica fuera de lo medible (${LIMITES_MEDIBLES.diastolica.join('-')}). Revise el valor.`;
  }

  const fc = numero(pulso);
  if (!String(pulso).trim()) errores.pulso = 'El pulso es obligatorio.';
  else if (fc === null || !Number.isInteger(fc)) errores.pulso = 'Ingrese un número entero.';
  else if (fc < LIMITES_MEDIBLES.pulso[0] || fc > LIMITES_MEDIBLES.pulso[1]) {
    errores.pulso = `Fuera de lo medible (${LIMITES_MEDIBLES.pulso.join('-')} lpm). Revise el valor.`;
  }

  const t = numero(temperatura);
  if (!String(temperatura).trim()) errores.temperatura = 'La temperatura es obligatoria.';
  else if (t === null) errores.temperatura = 'Ingrese un número (ej.: 36.5).';
  else if (t < LIMITES_MEDIBLES.temperatura[0] || t > LIMITES_MEDIBLES.temperatura[1]) {
    errores.temperatura = `Fuera de lo medible (${LIMITES_MEDIBLES.temperatura.join('-')} °C). Revise el valor.`;
  }

  // Opcionales: solo se validan si se escribió algo
  const enteroOpcional = (valor, campo, unidad) => {
    if (valor === undefined || valor === null || !String(valor).trim()) return;
    const n = numero(valor);
    const [min, max] = LIMITES_MEDIBLES[campo];
    if (n === null || !Number.isInteger(n)) errores[campo] = 'Ingrese un número entero.';
    else if (n < min || n > max) errores[campo] = `Fuera de lo medible (${min}-${max} ${unidad}). Revise el valor.`;
  };
  enteroOpcional(frecuenciaRespiratoria, 'frecuenciaRespiratoria', 'rpm');
  enteroOpcional(saturacion, 'saturacion', '%');
  return errores;
}

// ==================== EVALUACIÓN ====================

const hallazgo = (signo, severidad, titulo, descripcion) => ({ signo, severidad, titulo, descripcion });

function evaluarTemperatura(t, edad) {
  if (t === null) return [];
  const e = aNumeroEdad(edad);
  if (t < 35) return [hallazgo('temperatura', SEVERIDAD.CRITICA, 'Hipotermia', `Temperatura de ${t} °C (menor a 35 °C).`)];
  if (t > 41) return [hallazgo('temperatura', SEVERIDAD.CRITICA, 'Hipertermia', `Temperatura de ${t} °C (mayor a 41 °C).`)];
  if (t >= 39.1) return [hallazgo('temperatura', SEVERIDAD.ALTA, 'Fiebre alta', `Temperatura de ${t} °C.`)];
  if (t >= 38) {
    return e === 0
      ? [hallazgo('temperatura', SEVERIDAD.ALTA, 'Fiebre en lactante', `Temperatura de ${t} °C en menor de 1 año: requiere valoración médica.`)]
      : [hallazgo('temperatura', SEVERIDAD.MODERADA, 'Fiebre', `Temperatura de ${t} °C.`)];
  }
  if (t >= 37.5) return [hallazgo('temperatura', SEVERIDAD.MODERADA, 'Febrícula', `Temperatura de ${t} °C.`)];
  return [];
}

function evaluarPulso(fc, edad) {
  if (fc === null) return [];
  const rango = rangoPulso(edad);
  const texto = `${fc} lpm (normal para ${rango.grupo}: ${rango.min}-${rango.max}).`;
  if (fc < rango.min) return [hallazgo('pulso', SEVERIDAD.ALTA, 'Bradicardia', `Pulso de ${texto}`)];
  if (fc > rango.max) return [hallazgo('pulso', SEVERIDAD.ALTA, 'Taquicardia', `Pulso de ${texto}`)];
  return [];
}

function evaluarPresion(p, edad, sexo) {
  if (!p) return [];
  const e = aNumeroEdad(edad) ?? 18;
  const { sistolica: s, diastolica: d } = p;
  const valor = `${s}/${d} mmHg`;

  const minima = limiteHipotension(e);
  if (s < minima) {
    return [hallazgo('presion', SEVERIDAD.CRITICA, 'Hipotensión', `Presión de ${valor} (sistólica menor a ${minima} para la edad).`)];
  }

  // Niños de 1 a 12 años: tabla de cribado de la AAP
  if (e < 13) {
    const cribado = cribadoPresionInfantil(e, sexo);
    if (cribado && (s >= cribado[0] || d >= cribado[1])) {
      return [hallazgo('presion', SEVERIDAD.MODERADA, 'Presión elevada para la edad',
        `Presión de ${valor} (referencia para ${e} años: menos de ${cribado[0]}/${cribado[1]}). Requiere evaluación.`)];
    }
    return [];
  }

  // 13 años en adelante: categorías ACC/AHA
  if (s > 180 || d > 120) {
    return [hallazgo('presion', SEVERIDAD.CRITICA, 'Crisis hipertensiva', `Presión de ${valor} (mayor a 180/120).`)];
  }
  if (s >= 140 || d >= 90) {
    return [hallazgo('presion', SEVERIDAD.ALTA, 'Hipertensión estadio 2', `Presión de ${valor} (140/90 o más).`)];
  }
  if (s >= 130 || d >= 80) {
    return [hallazgo('presion', SEVERIDAD.MODERADA, 'Hipertensión estadio 1', `Presión de ${valor} (130-139 / 80-89).`)];
  }
  if (s >= 120) {
    return [hallazgo('presion', SEVERIDAD.MODERADA, 'Presión elevada', `Presión de ${valor} (120-129 / menos de 80).`)];
  }
  return [];
}

function evaluarRespiracion(fr, edad, edadMeses) {
  if (fr === null) return [];
  const e = aNumeroEdad(edad);
  const adulto = e !== null && e >= 16;
  if (adulto) {
    // NEWS2: ≤ 8 y ≥ 25 son 3 puntos; 21-24, 2 puntos; 9-11, 1 punto
    if (fr <= 8) return [hallazgo('frecuenciaRespiratoria', SEVERIDAD.CRITICA, 'Bradipnea grave', `Frecuencia respiratoria de ${fr} rpm (8 o menos). Requiere atención inmediata.`)];
    if (fr >= 25) return [hallazgo('frecuenciaRespiratoria', SEVERIDAD.CRITICA, 'Taquipnea grave', `Frecuencia respiratoria de ${fr} rpm (25 o más). Requiere atención inmediata.`)];
    if (fr >= 21) return [hallazgo('frecuenciaRespiratoria', SEVERIDAD.ALTA, 'Taquipnea', `Frecuencia respiratoria de ${fr} rpm (normal en adultos: 12-20).`)];
    if (fr <= 11) return [hallazgo('frecuenciaRespiratoria', SEVERIDAD.MODERADA, 'Frecuencia respiratoria baja', `Frecuencia respiratoria de ${fr} rpm (normal en adultos: 12-20).`)];
    return [];
  }
  const rango = rangoRespiracion(e);
  const meses = edadMeses ?? (e === null ? null : e * 12);
  const oms = respiracionRapidaOMS(meses);
  // PALS: menos de 10 o más de 60 rpm es anormal en un niño de cualquier edad
  if (fr < 10) {
    return [hallazgo('frecuenciaRespiratoria', SEVERIDAD.ALTA, 'Bradipnea', `Frecuencia respiratoria de ${fr} rpm (menos de 10). Requiere evaluación.`)];
  }
  if (fr < rango.min) {
    return [hallazgo('frecuenciaRespiratoria', SEVERIDAD.MODERADA, 'Frecuencia respiratoria baja', `Frecuencia respiratoria de ${fr} rpm (normal para ${rango.grupo}: ${rango.min}-${rango.max}).`)];
  }
  if (fr > 60) {
    return [hallazgo('frecuenciaRespiratoria', SEVERIDAD.ALTA, 'Respiración rápida', `Frecuencia respiratoria de ${fr} rpm (más de 60). Requiere evaluación.`)];
  }
  if (oms && fr > oms) {
    return [hallazgo('frecuenciaRespiratoria', SEVERIDAD.ALTA, 'Respiración rápida', `Frecuencia respiratoria de ${fr} rpm (más de ${oms}, criterio de la OMS para la edad). Requiere evaluación.`)];
  }
  if (fr > rango.max) {
    return [hallazgo('frecuenciaRespiratoria', SEVERIDAD.MODERADA, 'Taquipnea', `Frecuencia respiratoria de ${fr} rpm (normal para ${rango.grupo}: ${rango.min}-${rango.max}).`)];
  }
  return [];
}

function evaluarSaturacion(spo2) {
  if (spo2 === null) return [];
  const nota = 'En pacientes con EPOC u otra enfermedad respiratoria crónica la meta puede ser menor.';
  if (spo2 <= 91) return [hallazgo('saturacion', SEVERIDAD.CRITICA, 'Hipoxemia grave', `Saturación de oxígeno de ${spo2}% (91% o menos). Requiere atención inmediata.`)];
  if (spo2 <= 93) return [hallazgo('saturacion', SEVERIDAD.ALTA, 'Hipoxemia', `Saturación de oxígeno de ${spo2}% (normal: 96% o más). ${nota}`)];
  if (spo2 <= 95) return [hallazgo('saturacion', SEVERIDAD.MODERADA, 'Saturación baja', `Saturación de oxígeno de ${spo2}% (normal: 96% o más). ${nota}`)];
  return [];
}

const ORDEN = { critica: 0, alta: 1, moderada: 2 };

/**
 * Evalúa los signos vitales según la edad y el sexo del paciente.
 * Devuelve la lista de hallazgos anormales, del más al menos urgente.
 */
export function evaluarSignosVitales({
  presion, pulso, temperatura, frecuenciaRespiratoria, saturacion, edad, edadMeses, sexo,
}) {
  const opcional = (v) => (v === undefined || v === null || !String(v).trim() ? null : numero(v));
  return [
    ...evaluarPresion(leerPresion(presion), edad, sexo),
    ...evaluarPulso(numero(pulso), edad),
    ...evaluarTemperatura(numero(temperatura), edad),
    ...evaluarRespiracion(opcional(frecuenciaRespiratoria), edad, edadMeses),
    ...evaluarSaturacion(opcional(saturacion)),
  ].sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad]);
}

/** Textos de referencia para mostrar junto a cada campo */
export function referenciasParaEdad(edad, sexo) {
  const e = aNumeroEdad(edad);
  const rango = rangoPulso(e);
  const cribado = cribadoPresionInfantil(e, sexo);
  let presion;
  if (e !== null && e < 1) presion = `Sistólica de 70 o más`;
  else if (cribado) presion = `Entre ${limiteHipotension(e)} y ${cribado[0] - 1} de sistólica, diastólica menor a ${cribado[1]}`;
  else presion = `Sistólica ${limiteHipotension(e)}-119, diastólica menor a 80`;
  const respiracion = rangoRespiracion(e);
  return {
    presion,
    pulso: `${rango.min}-${rango.max} lpm`,
    temperatura: '35 a 37.4 °C',
    frecuenciaRespiratoria: `${respiracion.min}-${respiracion.max} rpm`,
    saturacion: '96% o más',
  };
}

// ==================== ALERTAS QUE SE GUARDAN ====================

// "Niega alergias", "sin alergias conocidas", "no refiere alergias", "ninguna alergia"…
const NIEGA_ALERGIA = /\b(niega|sin|no|ning[uú]n[ao]?|descarta)\b(\s+[a-záéíóúñ]+){0,2}\s+al[eé]rg/i;

/**
 * ¿Las observaciones mencionan una alergia? ("alergia", "alérgico", "alergica"…)
 * Las frases que la niegan ("niega alergias", "sin alergias conocidas") no cuentan.
 */
export const mencionaAlergia = (texto) => {
  const sinNegaciones = String(texto ?? '').replace(new RegExp(NIEGA_ALERGIA.source, 'gi'), '');
  return /al[eé]rg/i.test(sinNegaciones);
};

/**
 * Todas las alertas que genera una toma de signos: las de los signos
 * (tipo 'signos') y, si las observaciones mencionan una alergia, una de tipo 'alergia'.
 */
export function alertasDeLaToma({ observaciones, ...signos }) {
  const alertas = evaluarSignosVitales(signos)
    .map((h) => ({ tipo: 'signos', ...h }));
  if (mencionaAlergia(observaciones)) {
    alertas.push({
      tipo: 'alergia', signo: null, severidad: SEVERIDAD.ALTA, titulo: 'Alergia', descripcion: String(observaciones).trim(),
    });
  }
  return alertas;
}
