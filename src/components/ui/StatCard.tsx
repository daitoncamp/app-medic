import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { ReactNode } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import styles from './StatCard.module.css';

interface Props {
  icon: IconDefinition;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: string;
}

/** Tarjeta de métrica para los dashboards. tone cambia el color del ícono. */
function StatCard({ icon, label, value, hint, tone = 'accent' }: Props) {
  return (
    <div className={styles.card}>
      <div className={`${styles.icon} ${styles[tone]}`} aria-hidden="true">
        <FontAwesomeIcon icon={icon} />
      </div>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export default StatCard;
