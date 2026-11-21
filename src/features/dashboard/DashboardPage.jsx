import { obtenerSesion, ROLES } from '../../services/authService';
import InicioAdmin from './InicioAdmin';
import InicioEnfermeria from './InicioEnfermeria';
import InicioOdontologia from './InicioOdontologia';
import InicioRecepcion from './InicioRecepcion';

const VISTA_POR_ROL = {
  [ROLES.RECEPCIONISTA]: InicioRecepcion,
  [ROLES.ENFERMERA]: InicioEnfermeria,
  [ROLES.ODONTOLOGA]: InicioOdontologia,
  [ROLES.ADMIN]: InicioAdmin,
};

/** Inicio: cada rol ve las métricas que necesita para empezar su día */
function DashboardPage() {
  const sesion = obtenerSesion();
  const Vista = VISTA_POR_ROL[sesion.rol];
  return <Vista sesion={sesion} />;
}

export default DashboardPage;
