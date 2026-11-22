import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ElementType, ReactNode } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import styles from './Button.module.css';

export type Variante = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Atributos de botón y de enlace: con `as={Link}` o `as="a"` se usan to, state, href, target…
 */
type AtributosBoton = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>
  & Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download'>
  & {
    type?: 'button' | 'submit' | 'reset';
    as?: ElementType;
    /** Destino cuando as={Link} */
    to?: string;
    state?: unknown;
    className?: string;
    [dato: `data-${string}`]: string | undefined;
  };

interface ButtonProps extends AtributosBoton {
  variant?: Variante;
  size?: 'sm' | 'md';
  icon?: IconDefinition;
  children?: ReactNode;
}

/**
 * Botón de la app.
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger'
 * size: 'sm' | 'md'
 * as: permite renderizarlo como otro elemento (p. ej. Link o 'a')
 */
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  as: Componente = 'button',
  className = '',
  children,
  type,
  ...props
}: ButtonProps) {
  const clases = [styles.btn, styles[variant], styles[size], className].join(' ');
  return (
    <Componente
      className={clases}
      type={Componente === 'button' ? type || 'button' : undefined}
      {...props}
    >
      {icon && <FontAwesomeIcon icon={icon} className={styles.icon} />}
      {children}
    </Componente>
  );
}

/** Botón cuadrado solo con ícono. Necesita `label` para lectores de pantalla. */
interface IconButtonProps extends AtributosBoton {
  icon: IconDefinition;
  /** Texto para lectores de pantalla (también se muestra al pasar el mouse) */
  label: string;
  variant?: Variante;
}

export function IconButton({
  icon, label, variant = 'ghost', className = '', as: Componente = 'button', ...props
}: IconButtonProps) {
  return (
    <Componente
      className={[styles.btn, styles[variant], styles.iconOnly, className].join(' ')}
      aria-label={label}
      title={label}
      type={Componente === 'button' ? 'button' : undefined}
      {...props}
    >
      <FontAwesomeIcon icon={icon} />
    </Componente>
  );
}

export default Button;
