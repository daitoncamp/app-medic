import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '../hooks/useAuth'; 
import "./loginRecepcionista.css";
import logoUleam from '../assets/logo-uleam.png';



function LoginRecepcionista() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Extraemos la lógica del Hook
  const { login, loading, errorGeneral, fieldErrors, shake } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(email, password, "Recepcionista");
  };

  return (
    <div className="recepcionista-scope login-screen"> {/* Clase para centrar según tu CSS */}
      <img
        src={logoUleam}
        alt="Logo"
        className="logo-image" 
      />
      {/* Aplicamos la clase shake al contenedor principal si hay error */}
      <div className={`login-container ${shake ? 'shake' : ''}`}>
        <div className="login-icon">
          <div className="icon-circle blue">
            <FontAwesomeIcon icon={faUser} />
          </div>
        </div>

        <h2 className="title">Inicio de sesión</h2>
        <p className="login-subtitle">Acceso para recepcionista</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Correo electrónico</label>
          {/* Si hay error en email, añadimos la clase error-border de tu CSS */}
          <div className={`input-group ${fieldErrors.email ? 'error-border' : ''}`}>
            <FontAwesomeIcon icon={faEnvelope} />
            <input 
              type="email" 
              placeholder="usuario@clinica.com" 
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
              className="togglepassword" 
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>
          {fieldErrors.password && <small className="input-error">{fieldErrors.password}</small>}

          {/* Error general */}
          {errorGeneral && <p className="error-message" style={{color: '#e63946', textAlign: 'center'}}>{errorGeneral}</p>}

          <div className="button-group">
            <button type="button" className="cancel-btn" onClick={() => navigate('/')}>
              Cancelar
            </button>
            <button type="submit" className="loginbtn" disabled={loading}>
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

export default LoginRecepcionista;