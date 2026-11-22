import { Link } from 'react-router-dom';
import {
  faCircleExclamation, faClipboardCheck, faTooth, faUserClock,
} from '@fortawesome/free-solid-svg-icons';
import {
  AlertList, BarChart, Button, Card, EmptyState, PageHeader, StatCard, StatGrid,
} from '../../components/ui';
import { useRecurso } from '../../hooks/useRecurso';
import { obtenerAgenda } from '../../services/consultaApi';
import type { Usuario } from '../../types/dominio';
import styles from './Dashboard.module.css';

function InicioOdontologia({ sesion }: { sesion: Usuario }) {
  const { datos, error } = useRecurso(obtenerAgenda, [], { intervalo: 30000 });
  const agenda = datos?.agenda || [];
  const siguiente = agenda[0];
  const procedimientos = datos?.metricas.procedimientosMes || [];
  const valor = (v: number | undefined) => (datos ? v : '…');

  return (
    <div className={styles.layout}>
      <PageHeader title={`Hola, ${sesion.nombre}`} subtitle="Tu consulta de hoy" />

      <StatGrid>
        <StatCard icon={faUserClock} label="Pacientes preparados" value={valor(datos?.metricas.preparados)} hint="Ya pasaron por enfermería" />
        <StatCard icon={faClipboardCheck} label="Atendidos hoy" value={valor(datos?.metricas.atendidosHoy)} tone="success" />
        <StatCard icon={faCircleExclamation} label="Con alertas médicas" value={valor(datos?.metricas.conAlertas)} tone="danger" />
      </StatGrid>

      {datos && datos.metricas.sinFinalizarAnteriores > 0 && (
        <Card className={styles.reminder}>
          <p>
            <strong>
              {datos.metricas.sinFinalizarAnteriores === 1
                ? 'Una consulta de días anteriores quedó sin finalizar.'
                : `${datos.metricas.sinFinalizarAnteriores} consultas de días anteriores quedaron sin finalizar.`}
            </strong>
            {datos.metricas.sinFinalizarAnteriores === 1
              ? ' Revísala y finalízala para cerrar la atención.'
              : ' Revísalas y finalízalas para cerrar la atención.'}
          </p>
          <Button as={Link} to="/consulta" size="sm" variant="secondary">Ver en la agenda</Button>
        </Card>
      )}

      <div className={styles.split}>
        <Card title="Procedimientos del mes" subtitle="Registrados en diagnósticos">
          {procedimientos.length ? (
            <BarChart data={procedimientos} orientation="horizontal" label="Procedimientos del mes" />
          ) : (
            <EmptyState compact icon={faTooth} title="Sin procedimientos este mes" />
          )}
        </Card>

        <Card title={siguiente?.deOtroDia ? 'Consulta sin finalizar' : 'Próximo paciente'}>
          {siguiente ? (
            <div className={styles.next}>
              <p className={styles.nextName}>{siguiente.nombre}</p>
              <div className={styles.nextMeta}>
                <span>{siguiente.edad} años</span>
                <span>{siguiente.tratamiento}</span>
                {siguiente.signosVitales && <span>PA {siguiente.signosVitales.presion}</span>}
              </div>
              {siguiente.alertas.length > 0 && <AlertList compact alertas={siguiente.alertas} />}
              <Button as={Link} to="/consulta" state={{ citaId: siguiente.id }}>Iniciar consulta</Button>
            </div>
          ) : (
            <EmptyState
              compact
              icon={faUserClock}
              title={error ? 'No se pudo cargar la agenda' : 'Nadie en espera'}
              text={error ? error.message : 'Cuando enfermería prepare a un paciente, aparecerá aquí.'}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

export default InicioOdontologia;
