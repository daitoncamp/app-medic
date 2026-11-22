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

export const CARAS = ['VESTIBULAR', 'LINGUAL', 'MESIAL', 'DISTAL', 'OCLUSAL'] as const;
export type Cara = (typeof CARAS)[number];

/** Estado de una pieza o cara (en mayúsculas en la API, en minúsculas en pantalla) */
type Estado = string;

export interface Marca<E extends Estado = Estado> {
  pieza: number | string;
  cara: Cara | 'COMPLETA' | string;
  estado: E;
}

export interface ResumenPieza<E extends Estado = Estado> {
  completa: E | null;
  caras: Partial<Record<Cara, E>>;
}

export type ResumenOdontograma<E extends Estado = Estado> = Record<string, ResumenPieza<E>>;

export const esAusente = (estado: Estado | null | undefined): boolean => String(estado ?? '').toUpperCase() === 'AUSENTE';

/** Marcas en orden cronológico → { [pieza]: { completa, caras } } */
export function resumirMarcas<E extends Estado>(marcas: Marca<E>[]): ResumenOdontograma<E> {
  const resultado: ResumenOdontograma<E> = {};
  marcas.forEach(({ pieza, cara, estado }) => {
    const actual: ResumenPieza<E> = resultado[pieza] || { completa: null, caras: {} };
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
export function combinarOdontograma<E extends Estado>(
  anterior: ResumenOdontograma<E> = {},
  actual: ResumenOdontograma<E> = {},
): ResumenOdontograma<E> {
  const resultado: ResumenOdontograma<E> = { ...anterior };
  Object.entries(actual).forEach(([pieza, hoy]) => {
    if (hoy.completa) {
      resultado[pieza] = hoy;
      return;
    }
    const antes: ResumenPieza<E> = anterior[pieza] || { completa: null, caras: {} };
    resultado[pieza] = {
      completa: esAusente(antes.completa) ? null : antes.completa,
      caras: { ...antes.caras, ...hoy.caras },
    };
  });
  return resultado;
}

/** Todos los estados presentes en una pieza (completa y caras), sin repetir */
export const estadosDePieza = <E extends Estado>(marca: ResumenPieza<E> | null | undefined): E[] => {
  if (!marca) return [];
  return [...new Set([marca.completa, ...Object.values(marca.caras || {})].filter((e): e is E => Boolean(e)))];
};
