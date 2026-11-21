import { Link } from 'react-router-dom';
import {
  faCircleExclamation, faHourglassHalf, faUserCheck, faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { Button, Card, EmptyState, PageHeader, StatCard, StatGrid } from '../../components/ui';
import { useClinica } from '../../hooks/useClinica';
import { alertasDeHoy, minutosDesde, preparadosHoy, tiempoPromedioEspera } from './metricas';
import styles from './Dashboard.module.css';

const ESPERA_LARGA = 20; // minutos

function InicioEnfermeria({ sesion }) {
  const datos = useClinica();
  const cola = [...datos.pacientesEnEspera].sort((a, b) =>
    String(a.fechaLlegada).localeCompare(String(b.fechaLlegada)));
  const promedio = tiempoPromedioEspera(datos);
  const alertas = alertasDeHoy(datos);

  return (
    <div className={styles.layout}>
      <PageHeader
        title={`Hola, ${sesion.nombre}`}
        subtitle="Estado de la sala de espera"
        actions={<Button as={Link} to="/enfermeria">Ir a la sala de espera</Button>}
      />

      <StatGrid>
        <StatCard icon={faUsers} label="En espera" value={cola.length} />
        <StatCard
          icon={faHourglassHalf}
          label="Espera promedio hoy"
          value={promedio === null ? '—' : `${promedio} min`}
          hint="Desde la llegada hasta los signos vitales"
          tone="warning"
        />
        <StatCard icon={faUserCheck} label="Preparados hoy" value={preparadosHoy(datos)} tone="success" />
        <StatCard icon={faCircleExclamation} label="Alertas de hoy" value={alertas.length} tone="danger" />
      </StatGrid>

      <div className={styles.split}>
        <Card title="Cola de pacientes" subtitle="En orden de llegada" padded={false}>
          {cola.length ? (
            <ul className={styles.list}>
              {cola.map((p, i) => {
                const minutos = minutosDesde(p.fechaLlegada);
                return (
                  <li key={p.id} className={styles.item}>
                    <span className={styles.time}>{i + 1}.</span>
                    <div className={styles.itemText}>
                      <p className={styles.itemTitle}>{p.paciente}</p>
                      <p className={styles.itemSub}>{p.consulta} · cita {p.hora}</p>
                    </div>
                    {minutos !== null && (
                      <span className={`${styles.waiting} ${minutos >= ESPERA_LARGA ? styles.waitingLong : ''}`}>
                        {minutos} min esperando
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact icon={faUsers} title="Sala de espera vacía" text="Cuando recepción confirme una cita, el paciente aparecerá aquí." />
          )}
        </Card>

        <Card title="Alertas médicas de hoy" icon={faCircleExclamation} iconTone="danger" padded={false}>
          {alertas.length ? (
            alertas.map((a) => (
              <div key={a.id} className={styles.alert}>
                <p className={styles.itemTitle}>{a.paciente}</p>
                <p className={styles.itemSub}>{a.descripcion}</p>
              </div>
            ))
          ) : (
            <EmptyState compact title="Sin alertas" text="Las alergias anotadas en las observaciones aparecerán aquí." />
          )}
        </Card>
      </div>
    </div>
  );
}

export default InicioEnfermeria;
