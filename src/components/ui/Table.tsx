import type { CSSProperties, ReactNode } from 'react';
import styles from './Table.module.css';

export interface Columna<T> {
  key: string;
  header: string;
  render?: (fila: T) => ReactNode;
  align?: CSSProperties['textAlign'];
  className?: string;
}

interface Props<T> {
  columns: Columna<T>[];
  rows: T[];
  rowKey?: keyof T | ((fila: T) => string);
  empty?: ReactNode;
  caption?: string;
  onRowClick?: (fila: T) => void;
}

/**
 * Tabla que en pantallas pequeñas se convierte en tarjetas.
 * columns: [{ key, header, render?(fila), align?, className? }]
 */
function Table<T extends object>({ columns, rows, rowKey = 'id' as keyof T, empty, caption, onRowClick }: Props<T>) {
  if (!rows.length) return empty || null;

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" style={{ textAlign: col.align }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((fila) => (
            <tr
              key={typeof rowKey === 'function' ? rowKey(fila) : String(fila[rowKey])}
              className={onRowClick ? styles.clickable : undefined}
              onClick={onRowClick ? () => onRowClick(fila) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  data-label={col.header}
                  className={col.className ? styles[col.className] : undefined}
                  style={{ textAlign: col.align }}
                >
                  {col.render ? col.render(fila) : String((fila as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
