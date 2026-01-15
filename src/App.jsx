import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

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
        <Route path="/recepcionista-dashboard" element={<RecepcionistaDashboard />} />

        {/* Enfermera */}
        <Route path="/login-enfermera" element={<LoginEnfermera />} />
        <Route path="/enfermera-dashboard" element={<PanelEnfermera />} />

        {/* Odontóloga */}
        <Route path="/login-odontologa" element={<LoginOdontologa />} />
        <Route path="/odontologa-dashboard" element={<OdontologaDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
