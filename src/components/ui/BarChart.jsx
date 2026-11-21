import styles from './BarChart.module.css';

/**
 * Gráfico de barras sin librerías.
 * data: [{ label, value, highlight?, color? }]
 * orientation: 'vertical' (por defecto) | 'horizontal'
 * El valor de cada barra se muestra siempre, así no hace falta adivinarlo.
 */
function BarChart({ data, orientation = 'vertical', unit = '', label, emptyText = 'Sin datos para mostrar.' }) {
  const maximo = Math.max(1, ...data.map((d) => d.value));

  if (data.every((d) => !d.value)) {
    return <p className={styles.empty}>{emptyText}</p>;
  }

  if (orientation === 'horizontal') {
    return (
      <ul className={styles.horizontal} aria-label={label}>
        {data.map((d) => (
          <li key={d.label} className={styles.hRow}>
            <span className={styles.hLabel}>{d.label}</span>
            <span className={styles.hTrack}>
              <span className={styles.hBar} style={{ width: `${(d.value / maximo) * 100}%`, background: d.color }} />
            </span>
            <span className={styles.hValue}>{d.value}{unit}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.vertical} role="img" aria-label={label}>
      {data.map((d) => (
        <div key={d.label} className={styles.vCol}>
          <span className={styles.vValue}>{d.value}{unit}</span>
          <span className={styles.vTrack}>
            <span
              className={`${styles.vBar} ${d.highlight ? styles.highlight : ''}`}
              style={{ height: `${(d.value / maximo) * 100}%` }}
            />
          </span>
          <span className={`${styles.vLabel} ${d.highlight ? styles.labelHighlight : ''}`}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default BarChart;
