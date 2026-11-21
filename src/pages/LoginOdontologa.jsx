import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { faFaceSmile } from '@fortawesome/free-regular-svg-icons';

import { useAuth } from '../hooks/useAuth'; 
import "./loginOdontologa.css"; 
import logoUleam from '../assets/logo-uleam.png';

function LoginOdontologa() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Usamos el mismo hook funcional para los 3 roles
  const { login, loading, errorGeneral, fieldErrors, shake } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Enviamos el rol "Odontologa" para la redirección y validación
    login(email, password, "Odontologa");
  };

  return (
    /* Aplicamos el scope 'odontologa-scope' y la clase 'login-screen' para el fondo */
    <div className="odontologa-scope login-screen"> 
      <img
        src={logoUleam}
        alt="Logo"
        className="logo-image" 
      />

      <div className={`login-container ${shake ? 'shake' : ''}`}>
        <div className="login-icon">
          <div className="icon-circle purple">
            <FontAwesomeIcon icon={faFaceSmile} />
          </div>
        </div>

        <h2 className="login-title">Inicio de sesión</h2>
        <p className="login-subtitle">Acceso para odontóloga</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Correo electrónico</label>
          <div className={`input-group ${fieldErrors.email ? 'error-border' : ''}`}>
            <FontAwesomeIcon icon={faEnvelope} />
            <input 
              type="email" 
              placeholder="odontologa@clinica.com" 
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

          {errorGeneral && <p className="error-message" style={{color: '#e63946', textAlign: 'center'}}>{errorGeneral}</p>}

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

export default LoginOdontologa;