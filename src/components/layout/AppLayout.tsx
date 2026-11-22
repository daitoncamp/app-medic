import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faKey, faRightFromBracket, faXmark } from '@fortawesome/free-solid-svg-icons';
import logoUleam from '../../assets/logo-uleam.png';
import { cerrarSesion, NOMBRE_ROL, sesionActual } from '../../services/authService';
import { fechaLarga, iniciales } from '../../utils/formato';
import { IconButton, useConfirm, useToast } from '../ui';
import { menuPorRol } from './navegacion';
import styles from './AppLayout.module.css';

/**
 * Estructura común de todas las pantallas internas:
 * barra lateral con el menú del rol, barra superior y el contenido.
 * El atributo data-rol cambia el color de acento de toda la pantalla.
 */
function AppLayout() {
  const [sesion] = useState(sesionActual);
  const navigate = useNavigate();
  const confirmar = useConfirm();
  const toast = useToast();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Saludo una sola vez al iniciar sesión
  useEffect(() => {
    if (sessionStorage.getItem('mostrarBienvenida') === 'true') {
      sessionStorage.removeItem('mostrarBienvenida');
      toast.info(`Hola, ${sesion.nombre}. Sesión iniciada en ${NOMBRE_ROL[sesion.rol]}.`);
    }
  }, [sesion, toast]);

  const salir = async () => {
    const ok = await confirmar({
      title: '¿Cerrar sesión?',
      message: 'Tendrás que volver a ingresar tu correo y contraseña.',
      confirmText: 'Cerrar sesión',
    });
    if (ok) {
      await cerrarSesion();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className={styles.shell} data-rol={sesion.rol}>
      <a href="#contenido" className={styles.skip}>Saltar al contenido</a>

      <aside className={`${styles.sidebar} ${menuAbierto ? styles.open : ''}`} aria-label="Menú principal">
        <div className={styles.brand}>
          <img src={logoUleam} alt="Uleam" className={styles.logo} />
          <div>
            <p className={styles.brandTitle}>Clínica Dental</p>
            <p className={styles.brandRole}>{NOMBRE_ROL[sesion.rol]}</p>
          </div>
          <IconButton
            icon={faXmark}
            label="Cerrar menú"
            className={styles.closeMenu}
            onClick={() => setMenuAbierto(false)}
          />
        </div>

        <nav className={styles.nav}>
          {menuPorRol(sesion.rol).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
              onClick={() => setMenuAbierto(false)}
            >
              <FontAwesomeIcon icon={item.icon} className={styles.navIcon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.user}>
          <span className={styles.avatar} aria-hidden="true">{iniciales(sesion.nombre)}</span>
          <div className={styles.userText}>
            <p className={styles.userName}>{sesion.nombre}</p>
            <p className={styles.userEmail}>{sesion.email}</p>
          </div>
          <IconButton icon={faKey} label="Cambiar contraseña" onClick={() => navigate('/cambiar-password')} />
          <IconButton icon={faRightFromBracket} label="Cerrar sesión" onClick={salir} />
        </div>
      </aside>

      {menuAbierto && <div className={styles.backdrop} onClick={() => setMenuAbierto(false)} aria-hidden="true" />}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <IconButton
            icon={faBars}
            label="Abrir menú"
            className={styles.menuButton}
            onClick={() => setMenuAbierto(true)}
          />
          <p className={styles.date}>{fechaLarga()}</p>
        </header>

        <main id="contenido" className={styles.content} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
