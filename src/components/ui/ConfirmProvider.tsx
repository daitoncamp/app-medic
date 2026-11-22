import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import Modal from './Modal';
import Button from './Button';

export interface OpcionesConfirmar {
  title: ReactNode;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type Confirmar = (opciones: OpcionesConfirmar) => Promise<boolean>;

const ConfirmContext = createContext<Confirmar | null>(null);

/**
 * Reemplaza a window.confirm() con un diálogo de la app.
 *   const confirmar = useConfirm();
 *   if (await confirmar({ title: '¿Eliminar cita?', danger: true })) { ... }
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opciones, setOpciones] = useState<OpcionesConfirmar | null>(null);
  const resolverRef = useRef<((valor: boolean) => void) | null>(null);

  const confirmar = useCallback<Confirmar>((opts) => new Promise<boolean>((resolve) => {
    resolverRef.current = resolve;
    setOpciones(opts);
  }), []);

  const responder = useCallback((valor: boolean) => {
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
export const useConfirm = (): Confirmar => {
  const confirmar = useContext(ConfirmContext);
  if (!confirmar) throw new Error('useConfirm necesita <ConfirmProvider>.');
  return confirmar;
};
