// 1. Corregimos la ruta: dos puntos ".." para salir de la carpeta pages y entrar a src
import '../globals.css'; 

import { useNavigate } from 'react-router-dom'; // Importamos para poder navegar
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faStethoscope } from '@fortawesome/free-solid-svg-icons';
import { faFaceSmile } from '@fortawesome/free-regular-svg-icons';
import logoUleam from '../assets/logo-uleam.png';

// Componente de la tarjeta (se queda igual)
function RoleCard({ title, description, icon, colorClass, onClick }) {
  return (
    <div className="role-card" onClick={onClick}>
      <div className={`icon-circle ${colorClass}`}>
        <FontAwesomeIcon icon={icon} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

// 2. Cambiamos el nombre de "App" a "Home"
function Home() {
  const navigate = useNavigate(); // Inicializamos el navegador

  return (
    <>
      <img
        src={logoUleam}
        alt="Logo"
        className="logo-image" 
      />
      <div className="main-container">
        <h1 className="main-title">Sistema de gestión dental</h1>
        <p className="subtitle">Seleccione su rol para continuar</p>

        <div className="roles-container">
          <RoleCard 
            title="Recepcionista"
            description="Gestión de citas, pacientes y agenda"
            icon={faUser}
            colorClass="blue"
            // 3. Agregamos el evento para ir al login al hacer clic
            onClick={() => navigate('/login-recepcionista')}
          />

          {/* Tarjeta Enfermera - ACTUALIZADO */}
          <RoleCard 
            title="Enfermera"
            description="Preparación de pacientes y signos vitales"
            icon={faStethoscope}
            colorClass="green"
            onClick={() => navigate('/login-enfermera')} 
          />

          <RoleCard 
            title="Odontologa"
            description="Diagnóstico y tratamiento dental"
            icon={faFaceSmile}
            colorClass="purple"
            onClick={() => navigate('/login-odontologa')} 
          />
        </div>
      </div>
    </>
  );
}

// 4. Exportamos como Home
export default Home;