// ==================== DATOS DEL ODONTOGRAMA ====================
// Compartidos por la pantalla (SVG) y por el historial en PDF.

// Estados de un diente con sus colores (relleno de la corona, borde y texto)
export const ESTADOS_DIENTE = [
  { id: 'sano', label: 'Sano', fill: '#bbf7d0', stroke: '#16a34a', text: '#166534' },
  { id: 'caries', label: 'Caries', fill: '#fecaca', stroke: '#dc2626', text: '#991b1b' },
  { id: 'tratado', label: 'Tratado', fill: '#bfdbfe', stroke: '#2563eb', text: '#1e40af' },
  { id: 'observacion', label: 'Observación', fill: '#fef08a', stroke: '#ca8a04', text: '#854d0e' },
  { id: 'ausente', label: 'Ausente', fill: '#e5e7eb', stroke: '#6b7280', text: '#374151' },
];

export const estadoDiente = (id) => ESTADOS_DIENTE.find((e) => e.id === id);

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

export const esSuperior = (numero) => [1, 2, 5, 6].includes(Math.floor(numero / 10));

/**
 * Tipo de pieza según su número FDI (el segundo dígito es la posición).
 * Permanentes: 1-2 incisivo, 3 canino, 4-5 premolar, 6-8 molar.
 * Temporales:  1-2 incisivo, 3 canino, 4-5 molar.
 */
export const tipoDiente = (numero) => {
  const cuadrante = Math.floor(numero / 10);
  const posicion = numero % 10;
  const temporal = cuadrante >= 5;
  if (posicion <= 2) return 'incisivo';
  if (posicion === 3) return 'canino';
  if (temporal || posicion >= 6) return 'molar';
  return 'premolar';
};
