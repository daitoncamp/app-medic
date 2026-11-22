import type { ReactNode } from 'react';
import styles from './Tabs.module.css';

export interface Pestana<T extends string = string> {
  id: T;
  label: ReactNode;
  count?: number;
}

interface Props<T extends string> {
  items: Pestana<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}

/**
 * Pestañas accesibles.
 * items: [{ id, label, count? }]
 */
function Tabs<T extends string>({ items, value, onChange, label }: Props<T>) {
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
