import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faCalendarCheck, faCircleExclamation, faEnvelope, faHeartPulse, faPhone,
  faPrescription, faTooth, faUserSlash,
} from '@fortawesome/free-solid-svg-icons';
import { AlertList, Button, Card, EmptyState, EstadoCita } from '../../components/ui';
import { useRecurso } from '../../hooks/useRecurso';
import { obtenerFicha } from '../../services/recepcionApi';
import { edadTexto, formatearFecha, formatearFechaHora, iniciales } from '../../utils/formato';
import { ESTADOS_DIENTE } from '../consulta/dientes';
import AntecedentesCard from './AntecedentesCard';
import DocumentosPaciente from './DocumentosPaciente';
import styles from './Pacientes.module.css';

const TIPO_EVENTO = {
  cita: { icon: faCalendarCheck, tone: 'info' },
  signos: { icon: faHeartPulse, tone: 'success' },
  diagnostico: { icon: faTooth, tone: 'purple' },
  alerta: { icon: faCircleExclamation, tone: 'danger' },
  receta: { icon: faPrescription, tone: 'info' },
};

/** Ficha única del paciente: todo su historial en una línea de tiempo */
function FichaPacientePage() {
  const { cedula } = useParams();
  const { datos: ficha, cargando, error, recargar } = useRecurso(() => obtenerFicha(cedula), [cedula]);

  if (cargando && !ficha) {
    return <Card><EmptyState compact title="Cargando ficha…" /></Card>;
  }

  if (error && error.status !== 404) {
    return (
      <Card>
        <EmptyState icon={faCircleExclamation} title="No se pudo cargar la ficha" text={error.message}
          action={<Button variant="secondary" onClick={recargar}>Reintentar</Button>} />
      </Card>
    );
  }

  if (!ficha) {
    return (
      <Card>
        <EmptyState
          icon={faUserSlash}
          title="Paciente no encontrado"
          text={`No hay registros con la cédula ${cedula}.`}
          action={<Button as={Link} to="/pacientes" variant="secondary">Volver a pacientes</Button>}
        />
      </Card>
    );
  }

  const { paciente, citas, eventos, alertas, odontograma, antecedentes } = ficha;
  const marcados = Object.values(odontograma);
  const resumenOdontograma = ESTADOS_DIENTE
    .map((e) => ({ ...e, total: marcados.filter((v) => v === e.id).length }))
    .filter((e) => e.total > 0);

  return (
    <>
      <Link to="/pacientes" className={styles.back}>
        <FontAwesomeIcon icon={faArrowLeft} /> Pacientes
      </Link>

      <Card className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">{iniciales(paciente.nombre)}</span>
          <div>
            <h1 className={styles.name}>{paciente.nombre}</h1>
            <p className="muted">
              C.I. {paciente.cedula}
              {` · ${edadTexto(paciente.fechaNacimiento)}`}
              {paciente.sexo && ` · ${paciente.sexo}`}
              {` · Nació el ${formatearFecha(paciente.fechaNacimiento)}`}
            </p>
          </div>
        </div>
        <div className={styles.contact}>
          {paciente.telefono && (
            <Button as="a" href={`tel:${paciente.telefono}`} variant="secondary" size="sm" icon={faPhone}>{paciente.telefono}</Button>
          )}
          {paciente.correo && (
            <Button as="a" href={`mailto:${paciente.correo}`} variant="secondary" size="sm" icon={faEnvelope}>{paciente.correo}</Button>
          )}
        </div>

      </Card>

      <div className={styles.grid}>
        <Card title="Línea de tiempo" subtitle={`${eventos.length} registros`}>
          {eventos.length ? (
            <ol className={styles.timeline}>
              {eventos.map((e) => {
                const tipo = TIPO_EVENTO[e.tipo];
                return (
                  <li key={e.id} className={styles.event}>
                    <span className={`${styles.dot} ${styles[tipo.tone]}`} aria-hidden="true">
                      <FontAwesomeIcon icon={tipo.icon} />
                    </span>
                    <div className={styles.eventBody}>
                      <p className={styles.eventDate}>{formatearFechaHora(e.fecha)}</p>
                      <p className={styles.eventTitle}>{e.titulo}</p>
                      {e.detalle && <p className={styles.eventText}>{e.detalle}</p>}
                      {e.notas && e.notas !== 'Ninguna' && <p className={styles.eventNote}>{e.notas}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState compact title="Sin registros" />
          )}
        </Card>

        <div className={styles.sideCol}>
          <DocumentosPaciente ficha={ficha} onCambio={recargar} />

          <AntecedentesCard
            cedula={paciente.cedula}
            antecedentes={antecedentes}
            anteriores={ficha.antecedentesAnteriores}
            onCambio={recargar}
          />

          {alertas.length > 0 && (
            <Card title="Alertas médicas" icon={faCircleExclamation} iconTone="danger">
              <AlertList compact alertas={alertas} />
            </Card>
          )}

          <Card title="Citas" padded={false}>
            <ul className={styles.citas}>
              {citas.map((c) => (
                <li key={c.id}>
                  <span>
                    <strong>{c.consulta}</strong>
                    <span className="muted"> · {formatearFechaHora(`${c.fecha}T${c.hora}`)}</span>
                  </span>
                  <EstadoCita estado={c.estado} />
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Odontograma">
            {resumenOdontograma.length ? (
              <ul className={styles.teethSummary}>
                {resumenOdontograma.map((e) => (
                  <li key={e.id}>
                    <span>{e.label}</span>
                    <strong>
                      {Object.entries(odontograma).filter(([, v]) => v === e.id).map(([n]) => n).join(', ')}
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Sin dientes marcados.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

export default FichaPacientePage;
