import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { RUTAS } from './components/layout/navegacion';
import ProtectedRoute from './components/ProtectedRoute';
import { ConfirmProvider, ToastProvider } from './components/ui';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import CitasPage from './features/citas/CitasPage';
import EnfermeriaPage from './features/enfermeria/EnfermeriaPage';
import ConsultaPage from './features/consulta/ConsultaPage';
import PacientesPage from './features/pacientes/PacientesPage';
import FichaPacientePage from './features/pacientes/FichaPacientePage';
import UsuariosPage from './features/usuarios/UsuariosPage';
import { obtenerSesion } from './services/authService';

// Ruta protegida por los roles definidos en navegacion.js
const conRoles = (ruta, elemento) => (
  <Route element={<ProtectedRoute roles={ruta.roles} />}>
    <Route path={ruta.path} element={elemento} />
  </Route>
);

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Todo lo de adentro exige sesión y comparte el layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              {conRoles(RUTAS.inicio, <DashboardPage />)}
              {conRoles(RUTAS.citas, <CitasPage />)}
              {conRoles(RUTAS.enfermeria, <EnfermeriaPage />)}
              {conRoles(RUTAS.consulta, <ConsultaPage />)}
              {conRoles(RUTAS.pacientes, <PacientesPage />)}
              <Route element={<ProtectedRoute roles={RUTAS.pacientes.roles} />}>
                <Route path="/pacientes/:cedula" element={<FichaPacientePage />} />
              </Route>
              {conRoles(RUTAS.usuarios, <UsuariosPage />)}
            </Route>

            {/* Rutas de la versión anterior, para no romper enlaces guardados */}
            {['/login-recepcionista', '/login-enfermera', '/login-odontologa'].map((path) => (
              <Route key={path} path={path} element={<Navigate to="/login" replace />} />
            ))}
            {['/recepcionista-dashboard', '/enfermera-dashboard', '/odontologa-dashboard'].map((path) => (
              <Route key={path} path={path} element={<Navigate to="/inicio" replace />} />
            ))}

            <Route path="*" element={<Navigate to={obtenerSesion() ? '/inicio' : '/login'} replace />} />
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
