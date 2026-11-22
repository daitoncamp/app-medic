import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faCircleExclamation, faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons';
import styles from './Toast.module.css';
import { generarId } from '../../services/clinica';

type TipoToast = 'success' | 'error' | 'info';
type Mostrar = (mensaje: string, duracion?: number) => void;
export type Toast = Record<TipoToast, Mostrar>;

const ToastContext = createContext<Toast | null>(null);

const ICONOS = { success: faCircleCheck, error: faCircleExclamation, info: faCircleInfo };

/**
 * Notificaciones flotantes.
 *   const toast = useToast();
 *   toast.success('Cita guardada');  toast.error('...');  toast.info('...');
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: string; tipo: TipoToast; mensaje: string }[]>([]);

  const cerrar = useCallback((id: string) => setToasts((lista) => lista.filter((t) => t.id !== id)), []);

  const mostrar = useCallback((tipo: TipoToast, mensaje: string, duracion = 4000) => {
    const id = generarId('toast');
    setToasts((lista) => [...lista.slice(-2), { id, tipo, mensaje }]);
    setTimeout(() => cerrar(id), duracion);
  }, [cerrar]);

  const api = useMemo<Toast>(() => ({
    success: (mensaje, duracion) => mostrar('success', mensaje, duracion),
    error: (mensaje, duracion) => mostrar('error', mensaje, duracion),
    info: (mensaje, duracion) => mostrar('info', mensaje, duracion),
  }), [mostrar]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.tipo]}`}>
            <FontAwesomeIcon icon={ICONOS[t.tipo]} className={styles.icon} />
            <p>{t.mensaje}</p>
            <button type="button" className={styles.close} onClick={() => cerrar(t.id)} aria-label="Cerrar aviso">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): Toast => {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast necesita <ToastProvider>.');
  return toast;
};
