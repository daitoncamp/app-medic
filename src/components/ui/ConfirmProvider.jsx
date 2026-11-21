import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from './Modal';
import Button from './Button';

const ConfirmContext = createContext(null);

/**
 * Reemplaza a window.confirm() con un diálogo de la app.
 *   const confirmar = useConfirm();
 *   if (await confirmar({ title: '¿Eliminar cita?', danger: true })) { ... }
 */
export function ConfirmProvider({ children }) {
  const [opciones, setOpciones] = useState(null);
  const resolverRef = useRef(null);

  const confirmar = useCallback((opts) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setOpciones(opts);
  }), []);

  const responder = useCallback((valor) => {
    resolverRef.current?.(valor);
    resolverRef.current = null;
    setOpciones(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Modal
        open={Boolean(opciones)}
        onClose={() => responder(false)}
        title={opciones?.title}
        description={opciones?.message}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => responder(false)}>
              {opciones?.cancelText || 'Cancelar'}
            </Button>
            <Button variant={opciones?.danger ? 'danger' : 'primary'} onClick={() => responder(true)}>
              {opciones?.confirmText || 'Aceptar'}
            </Button>
          </>
        )}
      />
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = () => useContext(ConfirmContext);
