import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { obtenerSesion } from '../services/authService';

/**
 * Protege un grupo de rutas.
 * - Sin sesión → al login (y luego vuelve a la página pedida).
 * - Con un rol que no está en `roles` → a su inicio.
 *
 * Es solo la capa visual: la protección real de los datos la hace el backend.
 */
function ProtectedRoute({ roles, children }) {
  const sesion = obtenerSesion();
  const location = useLocation();

  if (!sesion) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }

  if (roles && !roles.includes(sesion.rol)) {
    return <Navigate to="/inicio" replace />;
  }

  return children || <Outlet />;
}

export default ProtectedRoute;
