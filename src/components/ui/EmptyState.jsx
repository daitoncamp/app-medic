import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './EmptyState.module.css';

function EmptyState({ icon, title, text, action, compact = false }) {
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
