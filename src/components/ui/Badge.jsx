import styles from './Badge.module.css';

/** tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple' */
function Badge({ tone = 'neutral', children }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

// Color de cada estado de cita (un solo lugar para toda la app)
const TONO_ESTADO = {
  Pendiente: 'warning',
  Confirmada: 'info',
  'En consulta': 'purple',
  Atendida: 'success',
  'No asistió': 'danger',
  Anulada: 'neutral',
};

export function EstadoCita({ estado }) {
  return <Badge tone={TONO_ESTADO[estado] || 'neutral'}>{estado}</Badge>;
}

export default Badge;
