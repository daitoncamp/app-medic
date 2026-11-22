import { estadoDiente, esSuperior, tipoDiente, type TipoDiente } from './dientes';

// Formas dibujadas para un diente superior: raíz arriba (y 0-34) y corona abajo (y 30-60).
// Los inferiores usan las mismas formas volteadas.
const FORMAS: Record<TipoDiente, { raices: string[]; corona: string }> = {
  incisivo: {
    raices: ['M13 34 C14 18 17 6 20 4 C23 6 26 18 27 34 Z'],
    corona: 'M10 33 C10 30 30 30 30 33 L31 51 C31 58 9 58 9 51 Z',
  },
  canino: {
    raices: ['M13 34 C14 15 17 2 20 1 C23 2 26 15 27 34 Z'],
    corona: 'M10 33 C10 30 30 30 30 33 L30.5 49 C29 55 23 60 20 60 C17 60 11 55 9.5 49 Z',
  },
  premolar: {
    raices: ['M11 34 C12 20 16 8 20 6 C24 8 28 20 29 34 Z'],
    corona: 'M7 33 C7 30 33 30 33 33 L33.5 50 C33.5 54 30 56 26 55.5 C23 55 22 57 20 57 C18 57 17 55 14 55.5 C10 56 6.5 54 6.5 50 Z',
  },
  molar: {
    raices: [
      'M6 34 C6 22 8 10 11.5 8 C15 10 17 22 17.5 34 Z',
      'M22.5 34 C23 22 25 10 28.5 8 C32 10 34 22 34 34 Z',
    ],
    corona: 'M3.5 33 C3.5 29.5 36.5 29.5 36.5 33 L37 50 C37 55 33 57.5 29 56.5 C26 56 24.5 58 20 58 C15.5 58 14 56 11 56.5 C7 57.5 3 55 3 50 Z',
  },
};

// Surcos de la cara oclusal para que premolares y molares se lean como tales
const SURCOS: Partial<Record<TipoDiente, string>> = {
  premolar: 'M14 44 C17 47 23 47 26 44',
  molar: 'M10 44 C14 47 18 46 20 44 C22 46 26 47 30 44 M20 44 L20 50',
};

/**
 * Dibujo de un diente. El color de la corona indica su estado.
 * Es solo la imagen: el botón y el número los pone el odontograma.
 */
interface Props {
  numero: number;
  estado: string | null | undefined;
  className?: string;
}

function Diente({ numero, estado, className }: Props) {
  const tipo = tipoDiente(numero);
  const forma = FORMAS[tipo];
  const info = estadoDiente(estado);
  const ausente = estado === 'ausente';

  return (
    <svg
      viewBox="0 0 40 62"
      className={className}
      aria-hidden="true"
      style={{ transform: esSuperior(numero) ? undefined : 'scaleY(-1)' }}
    >
      <g opacity={ausente ? 0.35 : 1}>
        {forma.raices.map((d) => (
          <path key={d} d={d} fill="#f3ece0" stroke="#c9bba4" strokeWidth="1.2" strokeLinejoin="round" />
        ))}
        <path
          d={forma.corona}
          fill={info ? info.fill : '#ffffff'}
          stroke={info ? info.stroke : '#b8c0cc'}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {SURCOS[tipo] && (
          <path d={SURCOS[tipo]} fill="none" stroke={info ? info.stroke : '#cbd5e1'} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
        )}
        {/* Brillo del esmalte */}
        <path d="M12 36 C12 34 16 33.5 18 34" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
      </g>
      {ausente && (
        <path d="M8 12 L32 56 M32 12 L8 56" stroke="#6b7280" strokeWidth="2.2" strokeLinecap="round" />
      )}
    </svg>
  );
}

export default Diente;
