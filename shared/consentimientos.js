// ==================== CONSENTIMIENTO INFORMADO ====================
// Código compartido: el formulario muestra el texto y la API guarda exactamente
// ese texto (si la plantilla cambia después, el consentimiento firmado no cambia).
//
// Basado en el Modelo de Gestión de Aplicación del Consentimiento Informado del
// MSP del Ecuador (Acuerdo Ministerial 5316, 2016): información clara sobre el
// procedimiento, riesgos, alternativas, posibilidad de preguntar y de revocar,
// y firma de un representante cuando el paciente es menor de edad.
// La clínica debe revisar y validar estos textos antes de usarlos con pacientes.
//
// Qué procedimiento usa qué plantilla está en shared/procedimientos.js.

import { buscarProcedimiento, PROCEDIMIENTOS } from './procedimientos.js';

export const MAYORIA_DE_EDAD = 18;

export const PARENTESCOS = ['Madre', 'Padre', 'Representante legal', 'Tutor o curador'];

const ANESTESIA = 'Puede usarse anestesia local. Sus riesgos, poco frecuentes, incluyen reacción alérgica, '
  + 'hematoma o dolor en el sitio de la inyección, adormecimiento que dura más de lo esperado y, en niños, '
  + 'mordedura accidental del labio o la lengua mientras dura el efecto.';

export const PLANTILLAS = {
  extraccion: {
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
  endodoncia: {
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
  restauracion: {
    descripcion: 'Retirar la caries o la parte dañada del diente y reconstruirla con el material indicado '
      + '(resina, ionómero de vidrio o amalgama), por lo general con anestesia local.',
    beneficio: 'Detener la caries y recuperar la forma y la función del diente.',
    riesgos: [
      'Sensibilidad al frío o al calor durante algunos días.',
      'Si la caries es profunda, puede afectar al nervio y requerir un tratamiento de conducto.',
      'Desgaste, fractura o cambio de color de la restauración con el tiempo.',
    ],
    alternativas: 'Otros materiales de restauración o no tratar, con riesgo de que la caries avance.',
  },
  corona: {
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
  ortodoncia: {
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
  pulpotomia: {
    descripcion: 'En un diente de leche o un diente permanente joven, retirar la parte inflamada del nervio que está '
      + 'en la corona, colocar un medicamento sobre el nervio que queda y restaurar el diente, con anestesia local.',
    beneficio: 'Eliminar el dolor y conservar el diente hasta su recambio o hasta que termine de formarse.',
    riesgos: [
      'Molestias durante los primeros días.',
      'Que el nervio que queda se infecte y haya que hacer una pulpectomía o extraer el diente.',
      'Cambio de color del diente.',
    ],
    alternativas: 'Pulpectomía o extracción del diente, con un mantenedor de espacio si hace falta.',
  },
  pulpectomia: {
    descripcion: 'En un diente de leche, retirar todo el nervio, limpiar los conductos y rellenarlos con un material '
      + 'que se reabsorbe cuando el diente se cambia, con anestesia local.',
    beneficio: 'Eliminar el dolor o la infección y conservar el diente de leche hasta su recambio.',
    riesgos: [
      'Molestias o inflamación después del tratamiento.',
      'Que la infección no se resuelva y haya que extraer el diente.',
      'En casos poco frecuentes, alteraciones en el diente permanente que se está formando debajo.',
    ],
    alternativas: 'Extracción del diente, con un mantenedor de espacio si hace falta.',
  },
  raspado: {
    descripcion: 'Limpieza profunda debajo de la encía para retirar el sarro y alisar la superficie de las raíces, '
      + 'por sectores y con anestesia local.',
    beneficio: 'Controlar la enfermedad de las encías (periodontitis) y reducir el riesgo de perder dientes.',
    riesgos: [
      'Sensibilidad al frío durante algunas semanas.',
      'Sangrado y molestias en las encías los primeros días.',
      'Retracción de la encía: los dientes pueden verse más largos.',
      'Si la enfermedad avanza, pueden necesitarse más sesiones o cirugía.',
    ],
    alternativas: 'Cirugía periodontal o no tratar, con riesgo de perder el soporte de los dientes.',
  },
  terceros: {
    descripcion: 'Extracción quirúrgica de una o varias muelas del juicio, con anestesia local: puede requerir abrir '
      + 'la encía, retirar parte del hueso, dividir la muela y colocar puntos.',
    beneficio: 'Evitar o tratar dolor, infecciones, caries o daño a las muelas vecinas.',
    riesgos: [
      'Dolor, inflamación y dificultad para abrir la boca durante varios días.',
      'Sangrado, hematoma, infección o alveolitis.',
      'Adormecimiento del labio inferior, el mentón o la lengua, por lo general temporal y rara vez permanente.',
      'En muelas superiores, comunicación con el seno maxilar.',
      'De forma muy poco frecuente, fractura de la mandíbula.',
    ],
    alternativas: 'Controles periódicos sin extraer, con riesgo de que aparezcan las molestias o complicaciones.',
  },
  drenaje: {
    descripcion: 'Abrir el absceso (acumulación de pus) a través de la encía o del diente para que salga la infección, '
      + 'con anestesia local cuando es posible.',
    beneficio: 'Aliviar el dolor y la presión, y controlar la infección.',
    riesgos: [
      'Dolor y sangrado en la zona.',
      'Que la infección continúe y se necesiten antibióticos o un nuevo drenaje.',
      'El drenaje no elimina la causa: después suele necesitarse un tratamiento de conducto o una extracción.',
    ],
    alternativas: 'Tratamiento solo con medicamentos, que por lo general no basta para resolver la infección.',
  },
  protesisFija: {
    descripcion: 'Reemplazar uno o más dientes perdidos con un puente fijo: se tallan los dientes vecinos que lo '
      + 'sostendrán, se toman impresiones y se cementa el puente.',
    beneficio: 'Recuperar la función para masticar, la estética y evitar que los dientes vecinos se muevan.',
    riesgos: [
      'Sensibilidad en los dientes tallados.',
      'Necesidad de un tratamiento de conducto en alguno de los dientes de soporte.',
      'Que el puente se despegue o se fracture.',
      'Caries en los bordes del puente si la higiene es deficiente.',
    ],
    alternativas: 'Prótesis removible, implantes o no reemplazar los dientes perdidos.',
  },
  blanqueamiento: {
    descripcion: 'Aclarar el color de los dientes con un gel blanqueador, en la clínica o en casa con férulas.',
    beneficio: 'Dientes más claros.',
    riesgos: [
      'Sensibilidad dental temporal.',
      'Irritación de la encía.',
      'El resultado varía de una persona a otra y no es permanente.',
      'Las resinas, coronas y otras restauraciones no cambian de color.',
    ],
    alternativas: 'No realizar el tratamiento o usar carillas o coronas.',
  },
};

export const PROCEDIMIENTOS_CON_CONSENTIMIENTO = PROCEDIMIENTOS.filter((p) => p.consentimiento).map((p) => p.nombre);

/** Acepta también nombres antiguos ("Resina") */
export const requiereConsentimiento = (procedimiento) => Boolean(buscarProcedimiento(procedimiento)?.consentimiento);

/**
 * Texto completo del consentimiento, en párrafos separados por una línea en blanco.
 * paciente: { nombre, cedula } · firmante: { nombre, cedula, parentesco? } · esRepresentante
 */
export function textoConsentimiento({ procedimiento, paciente, firmante, esRepresentante, odontologo }) {
  const p = PLANTILLAS[buscarProcedimiento(procedimiento)?.plantilla];
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
