import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faCircleExclamation, faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons';
import styles from './Toast.module.css';
import { generarId } from '../../services/clinica';

const ToastContext = createContext(null);

const ICONOS = { success: faCircleCheck, error: faCircleExclamation, info: faCircleInfo };

/**
 * Notificaciones flotantes.
 *   const toast = useToast();
 *   toast.success('Cita guardada');  toast.error('...');  toast.info('...');
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const cerrar = useCallback((id) => setToasts((lista) => lista.filter((t) => t.id !== id)), []);

  const mostrar = useCallback((tipo, mensaje, duracion = 4000) => {
    const id = generarId('toast');
    setToasts((lista) => [...lista.slice(-2), { id, tipo, mensaje }]);
    setTimeout(() => cerrar(id), duracion);
  }, [cerrar]);

  const api = useMemo(() => ({
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
export const useToast = () => useContext(ToastContext);
