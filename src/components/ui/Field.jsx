import { useId } from 'react';
import styles from './Field.module.css';

/**
 * Campo de formulario con etiqueta y mensaje de error accesibles.
 *   <Field label="Cédula" error={errores.cedula} value=... onChange=... />
 *   <Field as="select" label="Sexo">...opciones...</Field>
 *   <Field as="textarea" label="Notas" />
 */
function Field({ label, error, hint, as: Control = 'input', className = '', children, ...props }) {
  const id = useId();
  const ayudaId = `${id}-ayuda`;
  return (
    <div className={`${styles.field} ${className}`}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <Control
        id={id}
        className={`${styles.control} ${error ? styles.invalid : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? ayudaId : undefined}
        {...props}
      >
        {children}
      </Control>
      {error ? (
        <p id={ayudaId} className={styles.error} role="alert">{error}</p>
      ) : (
        hint && <p id={ayudaId} className={styles.hint}>{hint}</p>
      )}
    </div>
  );
}

/** Ubica campos en columnas que se apilan en pantallas pequeñas */
export function FieldRow({ children, columns = 2 }) {
  return (
    <div className={styles.row} style={{ '--columnas': columns }}>
      {children}
    </div>
  );
}

export default Field;
