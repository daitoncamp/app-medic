import { useState } from 'react';
import { faBroom, faEraser } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../../components/ui';
import CarasDiente from './CarasDiente';
import Diente from './Diente';
import {
  abreviaturaCara, DIENTES, ESTADOS_DIENTE, estadoDiente, estadoPrincipal, nombreCara,
} from './dientes';
import { CARAS, estadosDePieza } from '../../utils/odontograma';
import styles from './Odontograma.module.css';

const esTemporal = (n) => Math.floor(n / 10) >= 5;

/** Texto accesible de una pieza: "Diente 16: caries en oclusal y mesial" */
const describirPieza = (n, marca) => {
  if (!marca) return 'sin registrar';
  if (marca.completa && !Object.keys(marca.caras || {}).length) return estadoDiente(marca.completa)?.label || marca.completa;
  const caras = Object.entries(marca.caras || {})
    .map(([cara, estado]) => `${estadoDiente(estado)?.label.toLowerCase()} en ${nombreCara(cara, n).toLowerCase()}`);
  return [marca.completa && estadoDiente(marca.completa)?.label, ...caras].filter(Boolean).join(', ');
};

/**
 * Odontograma de un paciente, por diente completo o por caras.
 * estados:      lo que se ve: { [pieza]: { completa, caras: { OCLUSAL: 'caries' } } }
 * marcadosHoy:  las marcas hechas en esta consulta, con la misma forma (solo esas se pueden quitar)
 * onMarcar(numero, estado, cara), onQuitar(numero), onDeshacerTodo()
 * denticionInicial: 'adulto' | 'nino'
 */
function Odontograma({
  estados, marcadosHoy = {}, onMarcar, onQuitar, onDeshacerTodo, denticionInicial = 'adulto',
}) {
  // Si el paciente ya tiene marcas solo en dientes temporales, se abre esa dentición
  const [denticion, setDenticion] = useState(() => (
    Object.keys(estados).some((n) => esTemporal(Number(n))) && !Object.keys(estados).some((n) => !esTemporal(Number(n)))
      ? 'nino' : denticionInicial
  ));
  const [estadoActivo, setEstadoActivo] = useState('caries');
  const [modo, setModo] = useState('completo'); // 'completo' | 'caras'
  const [seleccionado, setSeleccionado] = useState(null);

  const tocarDiente = (numero) => {
    setSeleccionado(numero);
    if (modo === 'caras' && estadoActivo !== 'ausente') return; // se elige la cara en el panel
    const hoy = marcadosHoy[numero];
    if (!(hoy?.completa === estadoActivo && !Object.keys(hoy.caras || {}).length)) onMarcar(numero, estadoActivo, 'COMPLETA');
  };

  const tocarCara = (cara) => {
    if (estadoActivo === 'ausente') {
      onMarcar(seleccionado, 'ausente', 'COMPLETA');
      return;
    }
    if (marcadosHoy[seleccionado]?.caras?.[cara] !== estadoActivo) onMarcar(seleccionado, estadoActivo, cara);
  };

  const limpiarDiente = () => {
    onQuitar(seleccionado);
  };

  const totalHoy = Object.keys(marcadosHoy).length;

  const arcada = (cuadrantes, posicion) => (
    <div className={`${styles.arch} ${styles[posicion]}`}>
      {cuadrantes.map((cuadrante, i) => (
        <div key={i} className={styles.quadrant}>
          {cuadrante.map((n) => {
            const marca = estados[n];
            const principal = estadoDiente(estadoPrincipal(marca));
            return (
              <button
                key={n}
                type="button"
                className={`${styles.tooth} ${seleccionado === n ? styles.selected : ''} ${marcadosHoy[n] ? styles.today : ''}`}
                onClick={() => tocarDiente(n)}
                aria-label={`Diente ${n}: ${describirPieza(n, marca)}${marcadosHoy[n] ? ' (marcado hoy)' : ''}`}
                aria-pressed={seleccionado === n}
              >
                <Diente numero={n} estado={marca?.completa} className={styles.toothSvg} />
                <CarasDiente numero={n} marca={marca} className={styles.facesSvg} />
                <span
                  className={styles.number}
                  style={principal ? { background: principal.stroke, color: '#fff' } : undefined}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  const dientes = DIENTES[denticion];
  const resumen = ESTADOS_DIENTE
    .map((e) => ({ ...e, total: Object.values(estados).filter((m) => estadosDePieza(m).includes(e.id)).length }))
    .filter((e) => e.total > 0);
  const marcaSeleccionada = seleccionado && estados[seleccionado];
  const hoySeleccionado = seleccionado && marcadosHoy[seleccionado];

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

        <div className={styles.segmented} role="radiogroup" aria-label="Qué se marca">
          {[['completo', 'Diente completo'], ['caras', 'Por caras']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={modo === id}
              className={modo === id ? styles.segActive : ''}
              onClick={() => setModo(id)}
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
        {modo === 'completo'
          ? 'Elige un estado y toca los dientes para marcarlos completos.'
          : 'Toca un diente y luego, en el recuadro de abajo, la cara que quieres marcar.'}
        {' '}Vista de frente al paciente. Los números con borde son las marcas de esta consulta; el resto viene de visitas anteriores.
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

      {modo === 'caras' && (
        <div className={styles.facesPanel}>
          {seleccionado ? (
            <>
              <CarasDiente
                numero={seleccionado}
                marca={marcaSeleccionada}
                marcadasHoy={hoySeleccionado?.caras || {}}
                onCara={tocarCara}
                className={styles.facesBig}
              />
              <div className={styles.facesInfo}>
                <p className={styles.facesTitle}>Pieza {seleccionado}</p>
                {marcaSeleccionada?.completa === 'ausente' ? (
                  <p className={styles.help}>Pieza ausente. Si marcas una de sus caras, quedará registrada como presente.</p>
                ) : (
                <ul className={styles.facesList}>
                  {CARAS.map((cara) => {
                    const estado = marcaSeleccionada?.caras?.[cara] || marcaSeleccionada?.completa;
                    return (
                      <li key={cara}>
                        <strong>{abreviaturaCara(cara, seleccionado)}</strong> {nombreCara(cara, seleccionado)}:{' '}
                        {estadoDiente(estado)?.label || 'sin registrar'}
                      </li>
                    );
                  })}
                </ul>
                )}
                {estadoActivo === 'ausente' && (
                  <p className={styles.help}>"Ausente" se marca en el diente completo.</p>
                )}
              </div>
            </>
          ) : (
            <p className={styles.help}>Toca un diente del odontograma para marcar sus caras.</p>
          )}
        </div>
      )}

      <div className={styles.footer}>
        <p className={styles.summary}>
          {resumen.length
            ? resumen.map((e) => `${e.label}: ${e.total}`).join(' · ')
            : 'Sin dientes marcados.'}
        </p>
        <div className={styles.footerActions}>
          <Button variant="secondary" size="sm" icon={faEraser} disabled={!seleccionado || !marcadosHoy[seleccionado]} onClick={limpiarDiente}>
            {seleccionado && marcadosHoy[seleccionado] ? `Quitar marca de hoy del ${seleccionado}` : 'Quitar marca de hoy'}
          </Button>
          <Button variant="ghost" size="sm" icon={faBroom} disabled={!totalHoy} onClick={onDeshacerTodo}>
            Deshacer marcas de hoy{totalHoy ? ` (${totalHoy})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Odontograma;
