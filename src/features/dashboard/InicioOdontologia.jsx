import { Link } from 'react-router-dom';
import {
  faCircleExclamation, faClipboardCheck, faTooth, faUserClock,
} from '@fortawesome/free-solid-svg-icons';
import {
  AlertList, BarChart, Button, Card, EmptyState, PageHeader, StatCard, StatGrid,
} from '../../components/ui';
import { useClinica } from '../../hooks/useClinica';
import { obtenerPacientesOdontologia } from '../../services/clinica';
import { atendidosHoy, procedimientosDelMes } from './metricas';
import styles from './Dashboard.module.css';

function InicioOdontologia({ sesion }) {
  const datos = useClinica();
  const agenda = obtenerPacientesOdontologia(datos);
  const siguiente = agenda[0];
  const procedimientos = procedimientosDelMes(datos);
  const conAlertas = agenda.filter((p) => p.alertas.length > 0).length;

  return (
    <div className={styles.layout}>
      <PageHeader title={`Hola, ${sesion.nombre}`} subtitle="Tu consulta de hoy" />

      <StatGrid>
        <StatCard icon={faUserClock} label="Pacientes preparados" value={agenda.length} hint="Ya pasaron por enfermería" />
        <StatCard icon={faClipboardCheck} label="Atendidos hoy" value={atendidosHoy(datos)} tone="success" />
        <StatCard icon={faCircleExclamation} label="Con alertas médicas" value={conAlertas} tone="danger" />
      </StatGrid>

      <div className={styles.split}>
        <Card title="Procedimientos del mes" subtitle="Registrados en diagnósticos">
          {procedimientos.length ? (
            <BarChart data={procedimientos} orientation="horizontal" label="Procedimientos del mes" />
          ) : (
            <EmptyState compact icon={faTooth} title="Sin procedimientos este mes" />
          )}
        </Card>

        <Card title="Próximo paciente">
          {siguiente ? (
            <div className={styles.next}>
              <p className={styles.nextName}>{siguiente.nombre}</p>
              <div className={styles.nextMeta}>
                <span>{siguiente.edad} años</span>
                <span>{siguiente.tratamiento}</span>
                {siguiente.signosVitales && <span>PA {siguiente.signosVitales.presion}</span>}
              </div>
              {siguiente.alertas.length > 0 && <AlertList compact alertas={siguiente.alertas} />}
              <Button as={Link} to="/consulta" state={{ pacienteId: siguiente.id }}>Iniciar consulta</Button>
            </div>
          ) : (
            <EmptyState compact icon={faUserClock} title="Nadie en espera" text="Cuando enfermería prepare a un paciente, aparecerá aquí." />
          )}
        </Card>
      </div>
    </div>
  );
}

export default InicioOdontologia;
