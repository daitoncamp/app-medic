import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Cambiamos faUser por faStethoscope para el rol de enfermería
import { faStethoscope, faEnvelope, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '../hooks/useAuth'; 
// Asumiendo que usas el mismo CSS o uno con la misma estructura
import "./loginEnfermera.css"; 
import logoUleam from '../assets/logo-uleam.png';

function LoginEnfermera() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Extraemos la misma lógica del Hook universal
  const { login, loading, errorGeneral, fieldErrors, shake } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Importante: Pasamos "Enfermera" como tercer parámetro
    login(email, password, "Enfermera");
  };

  return (
    <div className="enfermera-scope login-screen">
      <img
        src={logoUleam}
        alt="Logo"
        className="logo-image" 
      />

      {/* Efecto shake si el hook detecta errores */}
      <div className={`login-container ${shake ? 'shake' : ''}`}>
        <div className="login-icon">
          {/* Usamos 'green' para diferenciar el rol visualmente */}
          <div className="icon-circle green">
            <FontAwesomeIcon icon={faStethoscope} />
          </div>
        </div>

        <h2 className="login-title">Inicio de sesión</h2>
        <p className="login-subtitle">Acceso para enfermera</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Correo electrónico</label>
          <div className={`input-group ${fieldErrors.email ? 'error-border' : ''}`}>
            <FontAwesomeIcon icon={faEnvelope} />
            <input 
              type="email" 
              placeholder="enfermera@clinica.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {fieldErrors.email && <small className="input-error">{fieldErrors.email}</small>}

          <label htmlFor="password">Contraseña</label>
          <div className={`input-group password-group ${fieldErrors.password ? 'error-border' : ''}`}>
            <FontAwesomeIcon icon={faLock} />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="********" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FontAwesomeIcon 
              icon={showPassword ? faEyeSlash : faEye} 
              className="toggle-password" 
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>
          {fieldErrors.password && <small className="input-error">{fieldErrors.password}</small>}

          {/* Mensaje de error centralizado */}
          {errorGeneral && (
            <p className="error-message" style={{color: '#e63946', textAlign: 'center'}}>
              {errorGeneral}
            </p>
          )}

          <div className="button-group">
            <button type="button" className="cancel-btn" onClick={() => navigate('/')}>
              Cancelar
            </button>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span> Verificando...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginEnfermera;