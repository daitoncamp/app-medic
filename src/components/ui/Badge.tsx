import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type Tono = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple';

function Badge({ tone = 'neutral', className = '', children }: { tone?: Tono; className?: string; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[tone]} ${className}`}>{children}</span>;
}

// Color de cada estado de cita (un solo lugar para toda la app)
const TONO_ESTADO: Record<string, Tono> = {
  Pendiente: 'warning',
  Confirmada: 'info',
  'En consulta': 'purple',
  Atendida: 'success',
  'No asistió': 'danger',
  Anulada: 'neutral',
};

export function EstadoCita({ estado }: { estado: string }) {
  return <Badge tone={TONO_ESTADO[estado] || 'neutral'}>{estado}</Badge>;
}

export default Badge;
