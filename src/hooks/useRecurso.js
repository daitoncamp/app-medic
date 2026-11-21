import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carga datos de la API y los mantiene al día.
 *   const { datos, cargando, error, recargar } = useRecurso(() => listarCitas(filtros), [filtros...], { intervalo: 30000 })
 *
 * - `deps`: cuando cambian, se vuelve a cargar.
 * - `intervalo`: recarga periódica (ms) para ver lo que hacen otras computadoras.
 */
export function useRecurso(cargar, deps = [], { intervalo, inicial = null } = {}) {
  const [datos, setDatos] = useState(inicial);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  // Siempre se usa la versión más reciente de `cargar` (con los filtros actuales)
  const cargarRef = useRef(cargar);
  useEffect(() => {
    cargarRef.current = cargar;
  });
  // Evita que una respuesta lenta pise a una más nueva
  const turno = useRef(0);

  const recargar = useCallback(async () => {
    const mio = ++turno.current;
    try {
      const resultado = await cargarRef.current();
      if (mio === turno.current) {
        setDatos(resultado);
        setError(null);
      }
    } catch (e) {
      if (mio === turno.current) setError(e);
    } finally {
      if (mio === turno.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
    if (!intervalo) return undefined;
    const id = setInterval(recargar, intervalo);
    return () => clearInterval(id);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { datos, cargando, error, recargar };
}
