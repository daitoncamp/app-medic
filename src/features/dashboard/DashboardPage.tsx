import type { ComponentType } from 'react';
import { sesionActual, ROLES } from '../../services/authService';
import type { Rol, Usuario } from '../../types/dominio';
import InicioAdmin from './InicioAdmin';
import InicioEnfermeria from './InicioEnfermeria';
import InicioOdontologia from './InicioOdontologia';
import InicioRecepcion from './InicioRecepcion';

const VISTA_POR_ROL: Record<Rol, ComponentType<{ sesion: Usuario }>> = {
  [ROLES.RECEPCIONISTA]: InicioRecepcion,
  [ROLES.ENFERMERA]: InicioEnfermeria,
  [ROLES.ODONTOLOGA]: InicioOdontologia,
  [ROLES.ADMIN]: InicioAdmin,
};

/** Inicio: cada rol ve las métricas que necesita para empezar su día */
function DashboardPage() {
  const sesion = sesionActual();
  const Vista = VISTA_POR_ROL[sesion.rol];
  return <Vista sesion={sesion} />;
}

export default DashboardPage;
