// ==================== ODONTOGRAMA POR CARAS ====================
// Código compartido por la API y la pantalla.
//
// Cada marca es { pieza, cara, estado }. cara es COMPLETA (todo el diente) o una
// de las cinco caras. El resultado por pieza es { completa, caras: { OCLUSAL: … } }.
//
// Reglas:
// - Una marca de diente completo más reciente reemplaza a las caras anteriores
//   (p. ej., una pieza con caries oclusal que luego se extrae queda "ausente").
// - Una cara marcada después de un diente completo se suma encima, salvo que el
//   diente estuviera ausente (la nueva marca indica que la pieza está presente).

export const CARAS = ['VESTIBULAR', 'LINGUAL', 'MESIAL', 'DISTAL', 'OCLUSAL'];

export const esAusente = (estado) => String(estado ?? '').toUpperCase() === 'AUSENTE';

/** Marcas en orden cronológico → { [pieza]: { completa, caras } } */
export function resumirMarcas(marcas) {
  const resultado = {};
  marcas.forEach(({ pieza, cara, estado }) => {
    const actual = resultado[pieza] || { completa: null, caras: {} };
    if (cara === 'COMPLETA') {
      resultado[pieza] = { completa: estado, caras: {} };
    } else {
      resultado[pieza] = {
        completa: esAusente(actual.completa) ? null : actual.completa,
        caras: { ...actual.caras, [cara]: estado },
      };
    }
  });
  return resultado;
}

/**
 * Lo que se ve en la consulta: las visitas anteriores con las marcas de hoy encima.
 * anterior y actual tienen la forma que devuelve resumirMarcas.
 */
export function combinarOdontograma(anterior = {}, actual = {}) {
  const resultado = { ...anterior };
  Object.entries(actual).forEach(([pieza, hoy]) => {
    if (hoy.completa) {
      resultado[pieza] = hoy;
      return;
    }
    const antes = anterior[pieza] || { completa: null, caras: {} };
    resultado[pieza] = {
      completa: esAusente(antes.completa) ? null : antes.completa,
      caras: { ...antes.caras, ...hoy.caras },
    };
  });
  return resultado;
}

/** Todos los estados presentes en una pieza (completa y caras), sin repetir */
export const estadosDePieza = (marca) => {
  if (!marca) return [];
  return [...new Set([marca.completa, ...Object.values(marca.caras || {})].filter(Boolean))];
};
