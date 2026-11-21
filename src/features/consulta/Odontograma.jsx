import { useState } from 'react';
import { faBroom, faEraser } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../../components/ui';
import Diente from './Diente';
import { DIENTES, ESTADOS_DIENTE, estadoDiente } from './dientes';
import styles from './Odontograma.module.css';

/**
 * Odontograma de un paciente.
 * estados: { [numeroDiente]: 'caries' | ... }
 * onChange(nuevosEstados) se llama en cada cambio.
 */
function Odontograma({ estados, onChange, onLimpiarTodo }) {
  const [denticion, setDenticion] = useState('adulto');
  const [estadoActivo, setEstadoActivo] = useState('caries');
  const [seleccionado, setSeleccionado] = useState(null);

  const marcar = (numero) => {
    setSeleccionado(numero);
    onChange({ ...estados, [numero]: estadoActivo });
  };

  const limpiarDiente = () => {
    const copia = { ...estados };
    delete copia[seleccionado];
    onChange(copia);
    setSeleccionado(null);
  };

  const arcada = (cuadrantes, posicion) => (
    <div className={`${styles.arch} ${styles[posicion]}`}>
      {cuadrantes.map((cuadrante, i) => (
        <div key={i} className={styles.quadrant}>
          {cuadrante.map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.tooth} ${seleccionado === n ? styles.selected : ''}`}
              onClick={() => marcar(n)}
              aria-label={`Diente ${n}: ${estadoDiente(estados[n])?.label || 'sin registrar'}`}
              aria-pressed={seleccionado === n}
            >
              <Diente numero={n} estado={estados[n]} className={styles.toothSvg} />
              <span
                className={styles.number}
                style={estados[n] ? { background: estadoDiente(estados[n]).stroke, color: '#fff' } : undefined}
              >
                {n}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );

  const dientes = DIENTES[denticion];
  const resumen = ESTADOS_DIENTE
    .map((e) => ({ ...e, total: Object.values(estados).filter((v) => v === e.id).length }))
    .filter((e) => e.total > 0);

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <div className={styles.segmented} role="radiogroup" aria-label="Dentición">
          {[['adulto', 'Permanente'], ['nino', 'Temporal (niño)']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={denticion === id}
              className={denticion === id ? styles.segActive : ''}
              onClick={() => setDenticion(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.palette} role="radiogroup" aria-label="Estado a marcar">
          {ESTADOS_DIENTE.map((e) => (
            <button
              key={e.id}
              type="button"
              role="radio"
              aria-checked={estadoActivo === e.id}
              className={`${styles.paletteItem} ${estadoActivo === e.id ? styles.paletteActive : ''}`}
              onClick={() => setEstadoActivo(e.id)}
            >
              <span className={styles.swatch} style={{ background: e.fill, borderColor: e.stroke }} aria-hidden="true" />
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.help}>
        Elige un estado y toca los dientes para marcarlos. Vista de frente al paciente.
        <span className={styles.scrollHint}> Desliza el odontograma para ver todas las piezas.</span>
      </p>

      <div className={styles.mouth}>
        <span className={styles.side}>Derecha</span>
        <div className={styles.arches}>
          {arcada(dientes.superior, 'upper')}
          {arcada(dientes.inferior, 'lower')}
        </div>
        <span className={styles.side}>Izquierda</span>
      </div>

      <div className={styles.footer}>
        <p className={styles.summary}>
          {resumen.length
            ? resumen.map((e) => `${e.label}: ${e.total}`).join(' · ')
            : 'Sin dientes marcados.'}
        </p>
        <div className={styles.footerActions}>
          <Button variant="secondary" size="sm" icon={faEraser} disabled={!seleccionado || !estados[seleccionado]} onClick={limpiarDiente}>
            {seleccionado ? `Quitar marca del ${seleccionado}` : 'Quitar marca'}
          </Button>
          <Button variant="ghost" size="sm" icon={faBroom} disabled={!Object.keys(estados).length} onClick={onLimpiarTodo}>
            Limpiar todo
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Odontograma;
