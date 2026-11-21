import { Navigate } from 'react-router-dom';
import { obtenerSesion, RUTA_LOGIN_POR_ROL, RUTA_POR_ROL } from '../services/authService';

/**
 * Protege una ruta por rol.
 * - Sin sesión → al login de ese rol.
 * - Con sesión de otro rol → a su propio dashboard.
 *
 * Nota: esto es solo la capa visual. La protección real de los datos
 * debe hacerla el backend (reglas por rol en la base de datos / API).
 */
function ProtectedRoute({ rol, children }) {
  const sesion = obtenerSesion();

  if (!sesion) {
    return <Navigate to={RUTA_LOGIN_POR_ROL[rol] || '/'} replace />;
  }

  if (sesion.rol !== rol) {
    return <Navigate to={RUTA_POR_ROL[sesion.rol] || '/'} replace />;
  }

  return children;
}

export default ProtectedRoute;
