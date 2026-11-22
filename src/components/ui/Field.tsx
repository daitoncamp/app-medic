import { useId, type ChangeEvent, type CSSProperties, type ElementType, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

/**
 * Campo de formulario con etiqueta y mensaje de error accesibles.
 *   <Field label="Cédula" error={errores.cedula} value=... onChange=... />
 *   <Field as="select" label="Sexo">...opciones...</Field>
 *   <Field as="textarea" label="Notas" />
 */
type AtributosControl = InputHTMLAttributes<HTMLInputElement>
  & Pick<SelectHTMLAttributes<HTMLSelectElement>, 'multiple'>
  & Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows' | 'cols' | 'wrap'>;

interface FieldProps extends Omit<AtributosControl, 'onChange'> {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  /** 'input' (por defecto), 'select' o 'textarea' */
  as?: ElementType;
  className?: string;
  children?: ReactNode;
  onChange?: (e: ChangeEvent<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>) => void;
}

function Field({ label, error, hint, as = 'input', className = '', children, ...props }: FieldProps) {
  const Control = as;
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
export function FieldRow({ children, columns = 2 }: { children: ReactNode; columns?: number }) {
  return (
    <div className={styles.row} style={{ '--columnas': columns } as CSSProperties}>
      {children}
    </div>
  );
}

export default Field;
