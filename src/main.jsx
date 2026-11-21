import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { borrarDatosLocalesAntiguos } from './services/clinica';
import './styles/tokens.css';
import './styles/base.css';

borrarDatosLocalesAntiguos();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
