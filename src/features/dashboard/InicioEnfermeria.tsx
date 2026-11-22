import { Link } from 'react-router-dom';
import {
  faCircleExclamation, faHourglassHalf, faUserCheck, faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { AlertList, Button, Card, EmptyState, PageHeader, StatCard, StatGrid } from '../../components/ui';
import { useRecurso } from '../../hooks/useRecurso';
import { obtenerSala } from '../../services/enfermeriaApi';
import { minutosDesde } from './metricas';
import type { Usuario } from '../../types/dominio';
import styles from './Dashboard.module.css';

const ESPERA_LARGA = 20; // minutos

function InicioEnfermeria({ sesion }: { sesion: Usuario }) {
  const { datos, error } = useRecurso(obtenerSala, [], { intervalo: 30000 });
  const cola = datos?.enEspera || [];
  const promedio = datos?.metricas.esperaPromedioMin ?? null;
  const alertas = datos?.alertasHoy || [];
  const valor = (v: number | string | undefined) => (datos ? v : '…');

  return (
    <div className={styles.layout}>
      <PageHeader
        title={`Hola, ${sesion.nombre}`}
        subtitle="Estado de la sala de espera"
        actions={<Button as={Link} to="/enfermeria">Ir a la sala de espera</Button>}
      />

      <StatGrid>
        <StatCard icon={faUsers} label="En espera" value={valor(cola.length)} />
        <StatCard
          icon={faHourglassHalf}
          label="Espera promedio hoy"
          value={valor(promedio === null ? '—' : `${promedio} min`)}
          hint="Desde la llegada hasta los signos vitales"
          tone="warning"
        />
        <StatCard icon={faUserCheck} label="Preparados hoy" value={valor(datos?.metricas.preparadosHoy)} tone="success" />
        <StatCard icon={faCircleExclamation} label="Alertas de hoy" value={valor(alertas.length)} tone="danger" />
      </StatGrid>

      <div className={styles.split}>
        <Card title="Cola de pacientes" subtitle="En orden de llegada" padded={false}>
          {cola.length ? (
            <ul className={styles.list}>
              {cola.map((p, i) => {
                const minutos = minutosDesde(p.llegadaEn);
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
            <EmptyState
              compact
              icon={faUsers}
              title={error ? 'No se pudo cargar la sala de espera' : 'Sala de espera vacía'}
              text={error ? error.message : 'Cuando recepción confirme una cita, el paciente aparecerá aquí.'}
            />
          )}
        </Card>

        <Card title="Alertas médicas de hoy" icon={faCircleExclamation} iconTone="danger" padded={false}>
          {alertas.length ? (
            <div className={styles.alertsBody}>
              <AlertList alertas={alertas} mostrarPaciente compact />
            </div>
          ) : (
            <EmptyState compact title="Sin alertas" text="Aparecen aquí los signos vitales fuera de lo normal y las alergias." />
          )}
        </Card>
      </div>
    </div>
  );
}

export default InicioEnfermeria;
