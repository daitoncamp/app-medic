import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarCheck, faCircleExclamation, faEye, faEyeSlash, faStethoscope, faTooth,
} from '@fortawesome/free-solid-svg-icons';
import logoUleam from '../../assets/logo-uleam.png';
import { Button, Field } from '../../components/ui';
import { iniciarSesion, obtenerSesion } from '../../services/authService';
import styles from './LoginPage.module.css';

// Las tres etapas de la atención, con el color que cada rol usa en su panel
const ETAPAS = [
  { icon: faCalendarCheck, titulo: 'Recepción', texto: 'Agenda y confirma citas', color: 'blue' },
  { icon: faStethoscope, titulo: 'Enfermería', texto: 'Registra signos vitales', color: 'green' },
  { icon: faTooth, titulo: 'Odontología', texto: 'Diagnostica y trata', color: 'purple' },
];

// Usuarios de prueba (se quitan junto con el modo demo de authService.js)
const USUARIOS_DEMO = [
  ['Recepción', 'recepcionista@live.uleam.edu.ec'],
  ['Enfermería', 'enfermera@live.uleam.edu.ec'],
  ['Odontología', 'odontologa@live.uleam.edu.ec'],
  ['Administración', 'admin@live.uleam.edu.ec'],
];

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [cargando, setCargando] = useState(false);

  if (obtenerSesion()) return <Navigate to="/inicio" replace />;

  const enviar = async (e) => {
    e.preventDefault();
    const nuevosErrores = {
      email: email.trim() ? '' : 'Ingresa tu correo.',
      password: password ? '' : 'Ingresa tu contraseña.',
    };
    setErrores(nuevosErrores);
    setErrorGeneral('');
    if (nuevosErrores.email || nuevosErrores.password) return;

    setCargando(true);
    try {
      await iniciarSesion(email, password);
      // Vuelve a la página que se quería abrir antes del login, si la hay
      navigate(location.state?.desde || '/inicio', { replace: true });
    } catch (error) {
      setErrorGeneral(error.message);
      setCargando(false);
    }
  };

  const usarDemo = (correo) => {
    setEmail(correo);
    setPassword('1234');
    setErrores({});
    setErrorGeneral('');
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-label="Presentación">
        <img src={logoUleam} alt="Universidad Laica Eloy Alfaro de Manabí" className={styles.logo} />
        <div>
          <h1 className={styles.heroTitle}>Sistema de gestión dental</h1>
          <p className={styles.heroText}>
            Clínica odontológica de la Uleam. Cada paciente pasa por tres etapas,
            y cada equipo ve solo lo que le toca.
          </p>
        </div>
        <ol className={styles.etapas}>
          {ETAPAS.map((etapa) => (
            <li key={etapa.titulo} className={styles.etapa}>
              <span className={`${styles.etapaIcon} ${styles[etapa.color]}`} aria-hidden="true">
                <FontAwesomeIcon icon={etapa.icon} />
              </span>
              <span>
                <strong>{etapa.titulo}</strong>
                <span className={styles.etapaTexto}>{etapa.texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.panel}>
        <form className={styles.form} onSubmit={enviar} noValidate>
          <img src={logoUleam} alt="" className={styles.logoMobile} />
          <h2 className={styles.title}>Iniciar sesión</h2>
          <p className={styles.subtitle}>Ingresa con tu correo institucional.</p>

          {errorGeneral && (
            <div className={styles.alert} role="alert">
              <FontAwesomeIcon icon={faCircleExclamation} />
              {errorGeneral}
            </div>
          )}

          <Field
            label="Correo"
            type="email"
            autoComplete="username"
            placeholder="usuario@live.uleam.edu.ec"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errores.email}
          />

          <div className={styles.passwordField}>
            <Field
              label="Contraseña"
              type={verClave ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errores.password}
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setVerClave(!verClave)}
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <FontAwesomeIcon icon={verClave ? faEyeSlash : faEye} />
            </button>
          </div>

          <Button type="submit" className={styles.submit} disabled={cargando}>
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </Button>

          <details className={styles.demo}>
            <summary>Usuarios de prueba</summary>
            <p className={styles.demoNote}>Contraseña: <code>1234</code>. Toca uno para rellenar el formulario.</p>
            <div className={styles.demoList}>
              {USUARIOS_DEMO.map(([rol, correo]) => (
                <button key={correo} type="button" className={styles.demoItem} onClick={() => usarDemo(correo)}>
                  <strong>{rol}</strong>
                  <span>{correo}</span>
                </button>
              ))}
            </div>
          </details>
        </form>
      </section>
    </div>
  );
}

export default LoginPage;
