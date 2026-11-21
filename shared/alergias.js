// ==================== MEDICAMENTOS Y ALERGIAS ====================
// Código compartido: el formulario de receta avisa antes de emitir y la API
// no deja guardar sin la confirmación de la odontóloga.
//
// Es una ayuda, no un sistema de interacciones farmacológicas: compara el
// nombre del medicamento con el texto de las alergias registradas y conoce
// algunos grupos frecuentes en odontología (reactividad cruzada).

const normalizar = (texto) => String(texto ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase();

// Grupos: si el paciente es alérgico a uno, se avisa con cualquiera del grupo
const GRUPOS = [
  {
    nombre: 'penicilinas',
    claves: ['penicilina', 'betalactam', 'amoxicilina', 'ampicilina', 'dicloxacilina', 'oxacilina', 'cloxacilina', 'amoxiclav', 'augmentin'],
  },
  {
    nombre: 'cefalosporinas',
    claves: ['cefalosporina', 'cefalexina', 'cefadroxilo', 'cefuroxima', 'ceftriaxona', 'cefazolina'],
  },
  {
    nombre: 'AINE',
    claves: ['aine', 'antiinflamatorio', 'ibuprofeno', 'naproxeno', 'diclofenaco', 'ketorolaco', 'aspirina',
      'acido acetilsalicilico', 'acetilsalicilico', 'meloxicam', 'nimesulida', 'piroxicam', 'ketoprofeno'],
  },
  {
    nombre: 'sulfas',
    claves: ['sulfa', 'sulfonamida', 'sulfametoxazol', 'cotrimoxazol', 'trimetoprim'],
  },
  {
    nombre: 'anestésicos locales tipo amida',
    claves: ['lidocaina', 'mepivacaina', 'articaina', 'bupivacaina', 'prilocaina'],
  },
  { nombre: 'clorhexidina', claves: ['clorhexidina'] },
  { nombre: 'macrólidos', claves: ['macrolido', 'eritromicina', 'azitromicina', 'claritromicina'] },
  { nombre: 'látex', claves: ['latex'] },
];

// Formas farmacéuticas: no identifican al medicamento
const FORMAS = new Set(['jarabe', 'tableta', 'tabletas', 'capsula', 'capsulas', 'enjuague', 'crema', 'solucion',
  'suspension', 'gotas', 'ampolla', 'ampollas', 'inyectable', 'comprimido', 'comprimidos', 'pediatrico', 'infantil']);

const palabras = (texto) => normalizar(texto).split(/[^a-z0-9]+/).filter((p) => p.length >= 5 && !FORMAS.has(p));

/**
 * Revisa un medicamento contra las alergias del paciente.
 * Devuelve el texto de la alergia que coincide (o null).
 *   coincidenciaAlergia('Amoxicilina', ['Alergia a la penicilina']) → 'Alergia a la penicilina'
 */
export function coincidenciaAlergia(medicamento, alergias = []) {
  const med = normalizar(medicamento);
  if (!med.trim()) return null;
  const gruposDelMed = GRUPOS.filter((g) => g.claves.some((c) => med.includes(c)));

  for (const alergia of alergias) {
    const texto = normalizar(alergia);
    if (!texto.trim() || /^ningun/.test(texto)) continue;
    // Mismo nombre: "amoxicilina" en "alérgico a amoxicilina"
    if (palabras(medicamento).some((p) => texto.includes(p))) return alergia;
    // Mismo grupo: "amoxicilina" con "alergia a la penicilina"
    if (gruposDelMed.some((g) => g.claves.some((c) => texto.includes(c)))) return alergia;
  }
  return null;
}

/** Medicamentos de una receta que coinciden con alguna alergia: [{ indice, medicamento, alergia }] */
export function revisarReceta(medicamentos = [], alergias = []) {
  return medicamentos
    .map((m, indice) => ({ indice, medicamento: m.medicamento, alergia: coincidenciaAlergia(m.medicamento, alergias) }))
    .filter((r) => r.alergia);
}
