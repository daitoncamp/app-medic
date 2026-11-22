import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleExclamation, faHeartPulse, faLungs, faTemperatureHalf, faTriangleExclamation, faWaveSquare, faWind,
} from '@fortawesome/free-solid-svg-icons';
import { TEXTO_SEVERIDAD } from '../../utils/signosVitales';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import styles from './AlertList.module.css';

const ICONO_SIGNO: Record<string, IconDefinition> = {
  presion: faHeartPulse,
  pulso: faWaveSquare,
  temperatura: faTemperatureHalf,
  frecuenciaRespiratoria: faWind,
  saturacion: faLungs,
};

/**
 * Lista de alertas médicas ordenadas por severidad.
 * alertas: [{ id?, titulo, descripcion, severidad, signo?, tipo?, paciente? }]
 * mostrarPaciente: añade el nombre del paciente (listas de varios pacientes)
 */
export interface AlertaLista {
  id?: string;
  titulo: string;
  descripcion?: string;
  severidad: string;
  signo?: string | null;
  tipo?: string;
  paciente?: string;
}

interface Props {
  alertas: AlertaLista[];
  mostrarPaciente?: boolean;
  compact?: boolean;
}

function AlertList({ alertas, mostrarPaciente = false, compact = false }: Props) {
  return (
    <ul className={`${styles.list} ${compact ? styles.compact : ''}`}>
      {alertas.map((a, i) => (
        <li key={a.id || `${a.titulo}-${i}`} className={`${styles.item} ${styles[a.severidad] || styles.alta}`}>
          <FontAwesomeIcon
            icon={a.tipo === 'alergia' ? faTriangleExclamation : (a.signo && ICONO_SIGNO[a.signo]) || faCircleExclamation}
            className={styles.icon}
          />
          <div className={styles.text}>
            <p className={styles.title}>
              {mostrarPaciente && a.paciente && <span className={styles.patient}>{a.paciente} · </span>}
              {a.titulo}
              <span className={styles.level}>{(TEXTO_SEVERIDAD as Record<string, string>)[a.severidad] || 'Importante'}</span>
            </p>
            {a.descripcion && <p className={styles.description}>{a.descripcion}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default AlertList;
