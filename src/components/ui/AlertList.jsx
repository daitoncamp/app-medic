import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleExclamation, faHeartPulse, faTemperatureHalf, faTriangleExclamation, faWaveSquare,
} from '@fortawesome/free-solid-svg-icons';
import { TEXTO_SEVERIDAD } from '../../utils/signosVitales';
import styles from './AlertList.module.css';

const ICONO_SIGNO = {
  presion: faHeartPulse,
  pulso: faWaveSquare,
  temperatura: faTemperatureHalf,
};

/**
 * Lista de alertas médicas ordenadas por severidad.
 * alertas: [{ id?, titulo, descripcion, severidad, signo?, tipo?, paciente? }]
 * mostrarPaciente: añade el nombre del paciente (listas de varios pacientes)
 */
function AlertList({ alertas, mostrarPaciente = false, compact = false }) {
  return (
    <ul className={`${styles.list} ${compact ? styles.compact : ''}`}>
      {alertas.map((a, i) => (
        <li key={a.id || `${a.titulo}-${i}`} className={`${styles.item} ${styles[a.severidad] || styles.alta}`}>
          <FontAwesomeIcon
            icon={a.tipo === 'alergia' ? faTriangleExclamation : ICONO_SIGNO[a.signo] || faCircleExclamation}
            className={styles.icon}
          />
          <div className={styles.text}>
            <p className={styles.title}>
              {mostrarPaciente && a.paciente && <span className={styles.patient}>{a.paciente} · </span>}
              {a.titulo}
              <span className={styles.level}>{TEXTO_SEVERIDAD[a.severidad] || 'Importante'}</span>
            </p>
            {a.descripcion && <p className={styles.description}>{a.descripcion}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default AlertList;
