import styles from './Tabs.module.css';

/**
 * Pestañas accesibles.
 * items: [{ id, label, count? }]
 */
function Tabs({ items, value, onChange, label }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {items.map((item) => {
        const activa = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activa}
            className={`${styles.tab} ${activa ? styles.active : ''}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}
            {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
