// ==================== DATOS DEL ODONTOGRAMA ====================
// Compartidos por la pantalla (SVG) y por el historial en PDF.

import type { Cara } from '../../types/api';
import type { EstadoPieza, MarcaPieza } from '../../types/dominio';

export type TipoDiente = 'incisivo' | 'canino' | 'premolar' | 'molar';

export interface EstadoDienteInfo {
  id: EstadoPieza;
  label: string;
  fill: string;
  stroke: string;
  text: string;
}

// Estados de un diente con sus colores (relleno de la corona, borde y texto)
export const ESTADOS_DIENTE: EstadoDienteInfo[] = [
  { id: 'sano', label: 'Sano', fill: '#bbf7d0', stroke: '#16a34a', text: '#166534' },
  { id: 'caries', label: 'Caries', fill: '#fecaca', stroke: '#dc2626', text: '#991b1b' },
  { id: 'tratado', label: 'Tratado', fill: '#bfdbfe', stroke: '#2563eb', text: '#1e40af' },
  { id: 'observacion', label: 'Observación', fill: '#fef08a', stroke: '#ca8a04', text: '#854d0e' },
  { id: 'ausente', label: 'Ausente', fill: '#e5e7eb', stroke: '#6b7280', text: '#374151' },
];

export const estadoDiente = (id: string | null | undefined): EstadoDienteInfo | undefined => ESTADOS_DIENTE.find((e) => e.id === id);

// Numeración FDI. Cada arcada se divide en dos cuadrantes (derecha | izquierda del paciente)
export const DIENTES = {
  adulto: {
    superior: [[18, 17, 16, 15, 14, 13, 12, 11], [21, 22, 23, 24, 25, 26, 27, 28]],
    inferior: [[48, 47, 46, 45, 44, 43, 42, 41], [31, 32, 33, 34, 35, 36, 37, 38]],
  },
  nino: {
    superior: [[55, 54, 53, 52, 51], [61, 62, 63, 64, 65]],
    inferior: [[85, 84, 83, 82, 81], [71, 72, 73, 74, 75]],
  },
};

export const esSuperior = (numero: number): boolean => [1, 2, 5, 6].includes(Math.floor(numero / 10));

/**
 * Tipo de pieza según su número FDI (el segundo dígito es la posición).
 * Permanentes: 1-2 incisivo, 3 canino, 4-5 premolar, 6-8 molar.
 * Temporales:  1-2 incisivo, 3 canino, 4-5 molar.
 */
export const tipoDiente = (numero: number): TipoDiente => {
  const cuadrante = Math.floor(numero / 10);
  const posicion = numero % 10;
  const temporal = cuadrante >= 5;
  if (posicion <= 2) return 'incisivo';
  if (posicion === 3) return 'canino';
  if (temporal || posicion >= 6) return 'molar';
  return 'premolar';
};

// ==================== CARAS DEL DIENTE ====================

const ANTERIOR: TipoDiente[] = ['incisivo', 'canino'];

/** Nombre de la cara según el diente: oclusal/incisal y lingual/palatino */
export const nombreCara = (cara: string, numero: number): string => {
  const anterior = ANTERIOR.includes(tipoDiente(numero));
  const nombres: Record<string, string> = {
    VESTIBULAR: 'Vestibular',
    LINGUAL: esSuperior(numero) ? 'Palatino' : 'Lingual',
    MESIAL: 'Mesial',
    DISTAL: 'Distal',
    OCLUSAL: anterior ? 'Incisal' : 'Oclusal',
  };
  return nombres[cara] || cara;
};

/** Abreviatura (O, I, M, D, V, L, P) para listas y el PDF */
export const abreviaturaCara = (cara: string, numero: number): string => nombreCara(cara, numero).charAt(0);

/**
 * Qué cara va en cada lado del dibujo de 5 caras, visto de frente al paciente:
 * - arriba/abajo: vestibular hacia afuera de la boca (arriba en la arcada superior, abajo en la inferior)
 * - izquierda/derecha: mesial hacia la línea media
 */
export type PosicionCara = 'arriba' | 'abajo' | 'izquierda' | 'derecha' | 'centro';

export const carasPorPosicion = (numero: number): Record<PosicionCara, Cara> => {
  const cuadrante = Math.floor(numero / 10);
  const ladoDerechoDelPaciente = [1, 4, 5, 8].includes(cuadrante); // se dibuja a la izquierda
  return {
    arriba: esSuperior(numero) ? 'VESTIBULAR' : 'LINGUAL',
    abajo: esSuperior(numero) ? 'LINGUAL' : 'VESTIBULAR',
    izquierda: ladoDerechoDelPaciente ? 'DISTAL' : 'MESIAL',
    derecha: ladoDerechoDelPaciente ? 'MESIAL' : 'DISTAL',
    centro: 'OCLUSAL',
  };
};

const PRIORIDAD: EstadoPieza[] = ['caries', 'observacion', 'tratado', 'sano'];

/** Estado que resume la pieza (para el color del número y los conteos) */
export const estadoPrincipal = (marca: MarcaPieza | null | undefined): EstadoPieza | null => {
  if (!marca) return null;
  if (marca.completa) return marca.completa;
  const caras = Object.values(marca.caras || {});
  return PRIORIDAD.find((e) => caras.includes(e)) || null;
};

/** Estado de una cara: su propia marca o, si no tiene, la del diente completo */
export const estadoCara = (marca: MarcaPieza | null | undefined, cara: Cara): EstadoPieza | null => marca?.caras?.[cara] || marca?.completa || null;
