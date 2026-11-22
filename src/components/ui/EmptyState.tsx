import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { ReactNode } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import styles from './EmptyState.module.css';

interface Props {
  icon?: IconDefinition;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

function EmptyState({ icon, title, text, action, compact = false }: Props) {
  return (
    <div className={`${styles.empty} ${compact ? styles.compact : ''}`}>
      {icon && (
        <div className={styles.icon} aria-hidden="true">
          <FontAwesomeIcon icon={icon} />
        </div>
      )}
      <p className={styles.title}>{title}</p>
      {text && <p className={styles.text}>{text}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

export default EmptyState;
