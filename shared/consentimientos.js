// ==================== CONSENTIMIENTO INFORMADO ====================
// Código compartido: el formulario muestra el texto y la API guarda exactamente
// ese texto (si la plantilla cambia después, el consentimiento firmado no cambia).
//
// Basado en el Modelo de Gestión de Aplicación del Consentimiento Informado del
// MSP del Ecuador (Acuerdo Ministerial 5316, 2016): información clara sobre el
// procedimiento, riesgos, alternativas, posibilidad de preguntar y de revocar,
// y firma de un representante cuando el paciente es menor de edad.
// La clínica debe revisar y validar estos textos antes de usarlos con pacientes.

export const MAYORIA_DE_EDAD = 18;

export const PARENTESCOS = ['Madre', 'Padre', 'Representante legal', 'Tutor o curador'];

const ANESTESIA = 'Puede usarse anestesia local. Sus riesgos, poco frecuentes, incluyen reacción alérgica, '
  + 'hematoma o dolor en el sitio de la inyección, adormecimiento que dura más de lo esperado y, en niños, '
  + 'mordedura accidental del labio o la lengua mientras dura el efecto.';

export const PLANTILLAS = {
  Extracción: {
    descripcion: 'Retirar una o varias piezas dentales con anestesia local, usando instrumentos dentales '
      + 'y, si hace falta, separando la encía o el hueso que rodea la raíz.',
    beneficio: 'Eliminar la fuente de dolor o infección, o preparar la boca para otro tratamiento.',
    riesgos: [
      'Dolor, inflamación y sangrado durante los primeros días.',
      'Infección o alveolitis (dolor intenso por pérdida del coágulo).',
      'Fractura de la raíz que obligue a un procedimiento más amplio.',
      'Daño a dientes o restauraciones vecinas.',
      'En piezas inferiores, adormecimiento del labio, el mentón o la lengua, por lo general temporal.',
      'En piezas superiores, comunicación con el seno maxilar.',
    ],
    alternativas: 'Conservar la pieza con un tratamiento de conducto o una restauración, cuando sea posible, '
      + 'o no tratarla, con riesgo de dolor e infección.',
  },
  Endodoncia: {
    descripcion: 'Tratamiento de conducto: retirar el tejido interno del diente (pulpa), limpiar y desinfectar '
      + 'los conductos y sellarlos, con anestesia local. Puede requerir varias citas.',
    beneficio: 'Conservar el diente y eliminar el dolor o la infección.',
    riesgos: [
      'Molestias o inflamación después del tratamiento.',
      'Fractura de un instrumento dentro del conducto o perforación de la raíz.',
      'Fractura del diente tratado; suele requerir una corona para protegerlo.',
      'Que el tratamiento no tenga éxito y haya que repetirlo o extraer el diente.',
    ],
    alternativas: 'Extraer el diente o no tratarlo, con riesgo de dolor, infección y pérdida del diente.',
  },
  Resina: {
    descripcion: 'Retirar la caries o la parte dañada del diente y reconstruirla con resina del color del diente, '
      + 'por lo general con anestesia local.',
    beneficio: 'Detener la caries y recuperar la forma y la función del diente.',
    riesgos: [
      'Sensibilidad al frío o al calor durante algunos días.',
      'Si la caries es profunda, puede afectar al nervio y requerir un tratamiento de conducto.',
      'Desgaste, fractura o cambio de color de la restauración con el tiempo.',
    ],
    alternativas: 'Otros materiales de restauración o no tratar, con riesgo de que la caries avance.',
  },
  Corona: {
    descripcion: 'Tallar el diente, tomar impresiones y colocar una corona que lo cubre por completo; '
      + 'mientras se fabrica se usa una corona provisional.',
    beneficio: 'Proteger un diente debilitado y recuperar su forma, función y estética.',
    riesgos: [
      'Sensibilidad después del tallado.',
      'Necesidad de un tratamiento de conducto si el nervio se inflama.',
      'Que la corona se despegue, se fracture o requiera ajustes de mordida.',
    ],
    alternativas: 'Una restauración directa, la extracción con reemplazo protésico o no tratar.',
  },
  Ortodoncia: {
    descripcion: 'Colocar aparatos fijos o removibles para mover los dientes a una mejor posición, '
      + 'con controles periódicos durante meses o años.',
    beneficio: 'Mejorar la posición de los dientes, la mordida, la higiene y la estética.',
    riesgos: [
      'Molestias y pequeñas heridas en la boca, sobre todo al inicio y tras cada ajuste.',
      'Manchas blancas o caries si la higiene es deficiente.',
      'Acortamiento de las raíces (reabsorción radicular).',
      'Que los dientes vuelvan a moverse si no se usan los retenedores.',
      'La duración puede ser mayor a la prevista.',
    ],
    alternativas: 'Otros tipos de aparatos o no realizar el tratamiento.',
  },
};

export const PROCEDIMIENTOS_CON_CONSENTIMIENTO = Object.keys(PLANTILLAS);

export const requiereConsentimiento = (procedimiento) => PROCEDIMIENTOS_CON_CONSENTIMIENTO.includes(procedimiento);

/**
 * Texto completo del consentimiento, en párrafos separados por una línea en blanco.
 * paciente: { nombre, cedula } · firmante: { nombre, cedula, parentesco? } · esRepresentante
 */
export function textoConsentimiento({ procedimiento, paciente, firmante, esRepresentante, odontologo }) {
  const p = PLANTILLAS[procedimiento];
  if (!p) return '';
  const quien = esRepresentante
    ? `Yo, ${firmante.nombre}, con cédula ${firmante.cedula}, en calidad de ${(firmante.parentesco || 'representante').toLowerCase()} `
      + `de ${paciente.nombre} (cédula ${paciente.cedula}),`
    : `Yo, ${paciente.nombre}, con cédula ${paciente.cedula},`;

  return [
    `${quien} declaro que ${odontologo || 'la odontóloga tratante'} me explicó en lenguaje claro el procedimiento `
      + `de ${procedimiento.toLowerCase()} que se propone realizar.`,
    `En qué consiste: ${p.descripcion}`,
    `Beneficio esperado: ${p.beneficio}`,
    `Riesgos y molestias posibles: ${p.riesgos.join(' ')} ${ANESTESIA}`,
    `Alternativas: ${p.alternativas}`,
    'Declaro que informé mis antecedentes médicos, alergias y medicamentos que tomo; que pude hacer '
      + 'preguntas y fueron respondidas; y que sé que puedo retirar este consentimiento en cualquier momento '
      + 'antes del procedimiento, sin que eso afecte mi atención.',
    `Por lo anterior, autorizo que se realice el procedimiento de ${procedimiento.toLowerCase()}.`,
  ].join('\n\n');
}
