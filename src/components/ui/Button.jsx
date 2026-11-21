import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './Button.module.css';

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
}) {
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
export function IconButton({ icon, label, variant = 'ghost', className = '', as: Componente = 'button', ...props }) {
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
