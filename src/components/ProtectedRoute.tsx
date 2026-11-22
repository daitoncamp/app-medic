import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { obtenerSesion } from '../services/authService';
import type { Rol } from '../types/dominio';

/**
 * Protege un grupo de rutas.
 * - Sin sesión → al login (y luego vuelve a la página pedida).
 * - Con contraseña temporal → a cambiarla antes de seguir.
 * - Con un rol que no está en `roles` → a su inicio.
 *
 * Es la capa visual: el servidor vuelve a verificar sesión y rol en cada petición.
 */
function ProtectedRoute({ roles, children }: { roles?: Rol[]; children?: ReactNode }) {
  const sesion = obtenerSesion();
  const location = useLocation();

  if (!sesion) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }

  if (sesion.debeCambiarPassword && location.pathname !== '/cambiar-password') {
    return <Navigate to="/cambiar-password" replace />;
  }

  if (roles && !roles.includes(sesion.rol)) {
    return <Navigate to="/inicio" replace />;
  }

  return children || <Outlet />;
}

export default ProtectedRoute;
