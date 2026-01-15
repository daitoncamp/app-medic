import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import "./loginRecepcionista.css"; // O la ruta donde pusiste tu CSS

function LoginRecepcionista() {
  const navigate = useNavigate();

  // --- ESTADOS (Sustituyen a los selectores de DOM) ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [shakeFields, setShakeFields] = useState({ email: false, password: false });

  // --- LÓGICA DE VALIDACIÓN ---
  const handleLogin = (e) => {
    e.preventDefault();
    
    // Limpiar errores previos
    setErrorGeneral('');
    setFieldErrors({ email: '', password: '' });
    setShakeFields({ email: false, password: false });

    let valido = true;

    if (email.trim() === "") {
      setFieldErrors(prev => ({ ...prev, email: "Este campo no puede estar vacío" }));
      setShakeFields(prev => ({ ...prev, email: true }));
      valido = false;
    }

    if (password.trim() === "") {
      setFieldErrors(prev => ({ ...prev, password: "Este campo no puede estar vacío" }));
      setShakeFields(prev => ({ ...prev, password: true }));
      valido = false;
    }

    if (!valido) {
      setErrorGeneral("Los campos no deben estar vacíos.");
      // Quitar el shake después de la animación
      setTimeout(() => setShakeFields({ email: false, password: false }), 400);
      return;
    }

    // --- EFECTO "VERIFICANDO..." ---
    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      // === VALIDACIÓN DE USUARIOS (Tal cual tu JS original) ===
      if (email === "recepcionista@live.uleam.edu.ec" && password === "1234") {
        sessionStorage.setItem("rol", "Recepcionista");
        sessionStorage.setItem("nombre", "Lucía Andrade");
        sessionStorage.setItem("mostrarBienvenida", "true");
        navigate('/recepcionista-dashboard');

      } else if (email === "enfermera@live.uleam.edu.ec" && password === "1234") {
        sessionStorage.setItem("rol", "Enfermera");
        sessionStorage.setItem("nombre", "María Pérez");
        sessionStorage.setItem("mostrarBienvenida", "true");
        navigate('/enfermera-dashboard');

      } else if (email === "odontologa@live.uleam.edu.ec" && password === "1234") {
        sessionStorage.setItem("rol", "Odontóloga");
        sessionStorage.setItem("nombre", "Dra. María Fernanda López");
        sessionStorage.setItem("mostrarBienvenida", "true");
        navigate('/odontologa-dashboard');

      } else {
        setErrorGeneral("Credenciales incorrectas. Intente nuevamente.");
        setShakeFields({ email: true, password: true });
        setTimeout(() => setShakeFields({ email: false, password: false }), 400);
      }
    }, 2000);
  };

  return (
    <div className="login-page-body">
      <img src="/logo-uleam.png" alt="Logo" className="logo-image" />

      <div className="login-container">
        <div className="login-icon">
          <div className="icon-circle blue">
            <FontAwesomeIcon icon={faUser} />
          </div>
        </div>

        <h2 className="login-title">Inicio de sesión</h2>
        <p className="login-subtitle">Acceso al Sistema Dental</p>

        <form className="login-form" onSubmit={handleLogin}>
          
          {/* Campo Email */}
          <label htmlFor="email">Correo electrónico</label>
          <div className={`input-group ${fieldErrors.email ? 'error-border' : ''} ${shakeFields.email ? 'shake' : ''}`}>
            <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
            <input 
              type="email" 
              id="email" 
              placeholder="usuario@live.uleam.edu.ec" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {fieldErrors.email && <small className="input-error">{fieldErrors.email}</small>}

          {/* Campo Password */}
          <label htmlFor="password">Contraseña</label>
          <div className={`input-group password-group ${fieldErrors.password ? 'error-border' : ''} ${shakeFields.password ? 'shake' : ''}`}>
            <FontAwesomeIcon icon={faLock} className="input-icon" />
            <input 
              type={showPassword ? "text" : "password"} 
              id="password" 
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

          {/* Mensaje de Error General */}
          {errorGeneral && <p className="error-message" style={{opacity: 1}}>{errorGeneral}</p>}

          <div className="button-group">
            <button type="button" className="cancel-btn" onClick={() => navigate('/')}>
              Cancelar
            </button>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <><span className="spinner"></span> Verificando...</> : "Iniciar sesión"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default login;