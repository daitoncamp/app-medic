import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './Card.module.css';

/** Contenedor blanco con borde. `title` y `actions` arman su encabezado. */
function Card({ title, icon, iconTone = 'accent', subtitle, actions, children, className = '', padded = true, as = 'section' }) {
  const Componente = as;
  return (
    <Componente className={`${styles.card} ${className}`}>
      {(title || actions) && (
        <header className={styles.header}>
          <div>
            {title && (
              <h2 className={styles.title}>
                {icon && <FontAwesomeIcon icon={icon} className={styles[iconTone]} />}
                {title}
              </h2>
            )}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      <div className={padded ? styles.body : undefined}>{children}</div>
    </Componente>
  );
}

export default Card;
