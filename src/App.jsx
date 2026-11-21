import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import ProtectedRoute from './components/ProtectedRoute';
import { ROLES } from './services/authService';

// RECEPCIONISTA
import LoginRecepcionista from './pages/LoginRecepcionista';
import RecepcionistaDashboard from './pages/RecepcionistaDashboard';

// ENFERMERÍA
import LoginEnfermera from './pages/LoginEnfermera';
import PanelEnfermera from './pages/EnfermeraDashboard';

// ODONTÓLOGA
import LoginOdontologa from './pages/LoginOdontologa';
import OdontologaDashboard from './pages/OdontologaDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Recepcionista */}
        <Route path="/login-recepcionista" element={<LoginRecepcionista />} />
        <Route
          path="/recepcionista-dashboard"
          element={
            <ProtectedRoute rol={ROLES.RECEPCIONISTA}>
              <RecepcionistaDashboard />
            </ProtectedRoute>
          }
        />

        {/* Enfermera */}
        <Route path="/login-enfermera" element={<LoginEnfermera />} />
        <Route
          path="/enfermera-dashboard"
          element={
            <ProtectedRoute rol={ROLES.ENFERMERA}>
              <PanelEnfermera />
            </ProtectedRoute>
          }
        />

        {/* Odontóloga */}
        <Route path="/login-odontologa" element={<LoginOdontologa />} />
        <Route
          path="/odontologa-dashboard"
          element={
            <ProtectedRoute rol={ROLES.ODONTOLOGA}>
              <OdontologaDashboard />
            </ProtectedRoute>
          }
        />

        {/* Cualquier otra ruta vuelve al inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
