import { Link } from 'react-router-dom';
import {
  faBell, faCalendarCheck, faCalendarDay, faCalendarXmark, faClock, faPlus,
} from '@fortawesome/free-solid-svg-icons';
import {
  BarChart, Button, Card, EmptyState, EstadoCita, PageHeader, StatCard, StatGrid,
} from '../../components/ui';
import { useRecurso } from '../../hooks/useRecurso';
import { ESTADOS_CITA, fechaLocalISO } from '../../services/clinica';
import { listarCitas } from '../../services/recepcionApi';
import { listarRecordatorios } from '../../services/recordatoriosApi';
import { agendaPorHora, contarPorEstado } from './metricas';
import type { Usuario } from '../../types/dominio';
import styles from './Dashboard.module.css';

function InicioRecepcion({ sesion }: { sesion: Usuario }) {
  // Citas de hoy desde la API, actualizadas cada 30 s
  const { datos: citas } = useRecurso(() => listarCitas({ fecha: fechaLocalISO() }), [], { intervalo: 30000, inicial: [] });
  const estados = contarPorEstado(citas);
  const proximas = citas.filter((c) => c.estado === ESTADOS_CITA.PENDIENTE || c.estado === ESTADOS_CITA.CONFIRMADA);
  // Recordatorios de mañana que aún no se envían
  const { datos: recordatorios } = useRecurso(() => listarRecordatorios(), [], { intervalo: 60000 });

  return (
    <div className={styles.layout}>
      <PageHeader
        title={`Hola, ${sesion.nombre}`}
        subtitle="Resumen de la agenda de hoy"
        actions={<Button as={Link} to="/citas" state={{ nuevaCita: true }} icon={faPlus}>Nueva cita</Button>}
      />

      <StatGrid>
        <StatCard icon={faCalendarDay} label="Citas de hoy" value={citas.length} />
        <StatCard icon={faCalendarCheck} label="Confirmadas" value={estados[ESTADOS_CITA.CONFIRMADA]} tone="info" />
        <StatCard icon={faClock} label="Pendientes de confirmar" value={estados[ESTADOS_CITA.PENDIENTE]} tone="warning" />
        <StatCard icon={faCalendarXmark} label="No asistieron" value={estados[ESTADOS_CITA.NO_ASISTIO]} tone="danger" />
      </StatGrid>

      {recordatorios && recordatorios.pendientes > 0 && (
        <Card className={styles.reminder}>
          <p>
            <strong>{recordatorios.pendientes} {recordatorios.pendientes === 1 ? 'paciente tiene' : 'pacientes tienen'} cita mañana</strong>
            {' '}y aún no {recordatorios.pendientes === 1 ? 'ha recibido' : 'han recibido'} recordatorio.
          </p>
          <Button as={Link} to="/recordatorios" size="sm" icon={faBell}>Enviar recordatorios</Button>
        </Card>
      )}

      <div className={styles.split}>
        <Card title="Agenda del día por hora" subtitle="Número de citas en cada franja horaria">
          <BarChart data={agendaPorHora(citas)} label="Citas por hora" emptyText="Todavía no hay citas para hoy." />
          {citas.length > 0 && <p className={styles.legend}>La barra más oscura es la hora actual.</p>}
        </Card>

        <Card
          title="Próximas citas"
          padded={false}
          actions={<Button as={Link} to="/citas" variant="ghost" size="sm">Ver todas</Button>}
        >
          {proximas.length ? (
            <ul className={styles.list}>
              {proximas.slice(0, 6).map((c) => (
                <li key={c.id} className={styles.item}>
                  <span className={styles.time}>{c.hora}</span>
                  <div className={styles.itemText}>
                    <p className={styles.itemTitle}>{c.paciente}</p>
                    <p className={styles.itemSub}>{c.consulta}</p>
                  </div>
                  <EstadoCita estado={c.estado} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={faCalendarDay} title="No hay citas por atender" text="Las citas de hoy aparecerán aquí." />
          )}
        </Card>
      </div>
    </div>
  );
}

export default InicioRecepcion;
