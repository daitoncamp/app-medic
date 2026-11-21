import { useEffect, useState } from 'react';
import { EVENTO_ACTUALIZACION, migrarDatosExistentes, obtenerDatosSync } from '../services/clinica';

/**
 * Devuelve los datos de la clínica y se actualiza solo cuando cambian,
 * tanto en esta pestaña (evento propio) como en otras (evento 'storage').
 *
 * Con el backend, este hook es el lugar para pedir los datos a la API
 * y escuchar cambios en tiempo real (WebSocket o polling).
 */
export function useClinica() {
  const [datos, setDatos] = useState(() => {
    migrarDatosExistentes();
    return obtenerDatosSync();
  });

  useEffect(() => {
    const recargar = () => setDatos(obtenerDatosSync());
    window.addEventListener(EVENTO_ACTUALIZACION, recargar);
    window.addEventListener('storage', recargar);
    return () => {
      window.removeEventListener(EVENTO_ACTUALIZACION, recargar);
      window.removeEventListener('storage', recargar);
    };
  }, []);

  return datos;
}
