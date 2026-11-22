import type { KeyboardEvent } from 'react';
import { carasPorPosicion, estadoCara, estadoDiente, nombreCara, type PosicionCara } from './dientes';
import type { Cara } from '../../types/api';
import type { MarcaPieza } from '../../types/dominio';

// Dibujo clásico de 5 caras (40 × 40): cuatro trapecios alrededor de un cuadrado central
const POLIGONOS: Record<PosicionCara, string> = {
  arriba: '2,2 38,2 27,13 13,13',
  abajo: '13,27 27,27 38,38 2,38',
  izquierda: '2,2 13,13 13,27 2,38',
  derecha: '38,2 38,38 27,27 27,13',
  centro: '13,13 27,13 27,27 13,27',
};

/**
 * Caras de una pieza.
 * marca: { completa, caras: { OCLUSAL: 'caries', … } }
 * onCara(cara): si se pasa, cada cara se puede tocar (y usar con teclado).
 */
interface Props {
  numero: number;
  marca: MarcaPieza | null | undefined;
  onCara?: (cara: Cara) => void;
  className?: string;
  /** Caras marcadas en esta consulta (se dibujan con borde oscuro) */
  marcadasHoy?: Partial<Record<Cara, unknown>>;
}

function CarasDiente({ numero, marca, onCara, className, marcadasHoy = {} }: Props) {
  const posiciones = carasPorPosicion(numero);
  const ausente = marca?.completa === 'ausente';

  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden={onCara ? undefined : 'true'} role={onCara ? 'group' : undefined}
      aria-label={onCara ? `Caras de la pieza ${numero}` : undefined}>
      {(Object.entries(POLIGONOS) as [PosicionCara, string][]).map(([posicion, puntos]) => {
        const cara = posiciones[posicion];
        const estado = ausente ? null : estadoCara(marca, cara);
        const info = estadoDiente(estado);
        const nombre = nombreCara(cara, numero);
        const interactiva = Boolean(onCara);
        return (
          <polygon
            key={posicion}
            points={puntos}
            fill={info ? info.fill : '#ffffff'}
            stroke={marcadasHoy[cara] ? '#334155' : info ? info.stroke : '#94a3b8'}
            strokeWidth={marcadasHoy[cara] ? 1.4 : 1}
            strokeLinejoin="round"
            {...(interactiva ? {
              role: 'button',
              tabIndex: 0,
              'aria-label': `${nombre}: ${info?.label || 'sin registrar'}`,
              style: { cursor: 'pointer' },
              onClick: () => onCara?.(cara),
              onKeyDown: (e: KeyboardEvent<SVGPolygonElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCara?.(cara);
                }
              },
            } : {})}
          >
            {interactiva && <title>{nombre}</title>}
          </polygon>
        );
      })}
      {ausente && <path d="M6 6 L34 34 M34 6 L6 34" stroke="#6b7280" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  );
}

export default CarasDiente;
