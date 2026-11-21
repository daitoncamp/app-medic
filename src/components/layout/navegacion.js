import {
  faCalendarCheck, faHouse, faStethoscope, faTooth, faUserGear, faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { ROLES } from '../../services/authService';

// Rutas de la app y qué roles pueden entrar a cada una.
// Se usa para el menú lateral y para proteger las rutas en App.jsx.
export const RUTAS = {
  inicio: { path: '/inicio', label: 'Inicio', icon: faHouse, roles: Object.values(ROLES) },
  citas: { path: '/citas', label: 'Citas', icon: faCalendarCheck, roles: [ROLES.RECEPCIONISTA, ROLES.ADMIN] },
  enfermeria: { path: '/enfermeria', label: 'Enfermería', icon: faStethoscope, roles: [ROLES.ENFERMERA] },
  consulta: { path: '/consulta', label: 'Consulta', icon: faTooth, roles: [ROLES.ODONTOLOGA] },
  pacientes: { path: '/pacientes', label: 'Pacientes', icon: faUsers, roles: Object.values(ROLES) },
  usuarios: { path: '/usuarios', label: 'Usuarios', icon: faUserGear, roles: [ROLES.ADMIN] },
};

export const menuPorRol = (rol) => Object.values(RUTAS).filter((r) => r.roles.includes(rol));
