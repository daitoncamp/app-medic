import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from './Button';
import styles from './Modal.module.css';

/**
 * Ventana modal accesible: se cierra con Escape o clic afuera,
 * enfoca el primer campo al abrir y devuelve el foco al cerrar.
 * size: 'sm' | 'md' | 'lg'
 */
interface Props {
  open: boolean;
  onClose?: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

function Modal({ open, onClose, title, description, children, footer, size = 'md' }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  const descripcionId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const anterior = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const primerCampo = panel?.querySelector<HTMLElement>('input, select, textarea, button:not([data-cerrar])');
    (primerCampo || panel)?.focus();

    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', alPresionar);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = '';
      anterior?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={panelRef}
        className={`${styles.panel} ${styles[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={description ? descripcionId : undefined}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div>
            <h2 id={tituloId} className={styles.title}>{title}</h2>
            {description && <p id={descripcionId} className={styles.description}>{description}</p>}
          </div>
          <IconButton icon={faXmark} label="Cerrar" onClick={onClose} data-cerrar="" />
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
