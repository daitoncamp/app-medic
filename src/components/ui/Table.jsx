import styles from './Table.module.css';

/**
 * Tabla que en pantallas pequeñas se convierte en tarjetas.
 * columns: [{ key, header, render?(fila), align?, className? }]
 */
function Table({ columns, rows, rowKey = 'id', empty, caption, onRowClick }) {
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
              key={typeof rowKey === 'function' ? rowKey(fila) : fila[rowKey]}
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
                  {col.render ? col.render(fila) : fila[col.key]}
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
