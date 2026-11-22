import { useEffect, useState } from 'react';

/** Devuelve `valor` con un retraso: evita llamar a la API en cada tecla de una búsqueda */
export function useDiferido<T>(valor: T, ms = 300): T {
  const [diferido, setDiferido] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);
  return diferido;
}
