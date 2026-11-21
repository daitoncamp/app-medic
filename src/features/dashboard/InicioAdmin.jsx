import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  faCalendarWeek, faPercent, faUserGear, faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { BarChart, Button, Card, PageHeader, StatCard, StatGrid } from '../../components/ui';
import { useRecurso } from '../../hooks/useRecurso';
import { EVENTO_USUARIOS, listarUsuarios } from '../../services/authService';
import { ESTADOS_CITA, fechaLocalISO } from '../../services/clinica';
import { listarCitas, listarPacientes } from '../../services/recepcionApi';
import { citasUltimos7Dias, contarPorEstado, tasaInasistencia } from './metricas';
import styles from './Dashboard.module.css';

// Mismo color que la etiqueta de cada estado en la tabla de citas
const COLOR_ESTADO = {
  [ESTADOS_CITA.PENDIENTE]: '#eab308',
  [ESTADOS_CITA.CONFIRMADA]: '#3b82f6',
  [ESTADOS_CITA.EN_CONSULTA]: '#a855f7',
  [ESTADOS_CITA.ATENDIDA]: '#22c55e',
  [ESTADOS_CITA.NO_ASISTIO]: '#ef4444',
  [ESTADOS_CITA.ANULADA]: '#94a3b8',
};

const haceDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fechaLocalISO(d);
};

function InicioAdmin({ sesion }) {
  // Citas de los últimos 30 días y total de pacientes, desde la API
  const { datos: citas } = useRecurso(() => listarCitas({ desde: haceDias(29), hasta: fechaLocalISO() }), [], { inicial: [] });
  const { datos: pacientes } = useRecurso(() => listarPacientes({ limite: 1 }), [], { inicial: { total: 0 } });
  // Las funciones de métricas reciben { citasDelDia }
  const datos = { citasDelDia: citas };
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    const cargar = () => listarUsuarios().then(setUsuarios).catch(() => setUsuarios([]));
    cargar();
    window.addEventListener(EVENTO_USUARIOS, cargar);
    return () => window.removeEventListener(EVENTO_USUARIOS, cargar);
  }, []);

  const semana = citasUltimos7Dias(datos);
  const totalSemana = semana.reduce((s, d) => s + d.value, 0);
  const estados = contarPorEstado(datos.citasDelDia);
  const inasistencia = tasaInasistencia(datos);

  return (
    <div className={styles.layout}>
      <PageHeader
        title={`Hola, ${sesion.nombre}`}
        subtitle="Vista general de la clínica"
        actions={<Button as={Link} to="/usuarios" variant="secondary" icon={faUserGear}>Gestionar usuarios</Button>}
      />

      <StatGrid>
        <StatCard icon={faUsers} label="Pacientes registrados" value={pacientes.total} />
        <StatCard icon={faCalendarWeek} label="Citas últimos 7 días" value={totalSemana} tone="info" />
        <StatCard icon={faPercent} label="Inasistencia (30 días)" value={inasistencia === null ? '—' : `${inasistencia}%`} hint="Sobre citas ya cerradas" tone="warning" />
        <StatCard icon={faUserGear} label="Usuarios activos" value={usuarios.filter((u) => u.activo).length} tone="success" />
      </StatGrid>

      <div className={styles.split}>
        <Card title="Citas por día" subtitle="Últimos 7 días">
          <BarChart data={semana} label="Citas por día en los últimos 7 días" />
        </Card>
        <Card title="Citas por estado" subtitle="Últimos 30 días">
          <BarChart
            orientation="horizontal"
            label="Citas por estado"
            data={Object.values(ESTADOS_CITA).map((e) => ({ label: e, value: estados[e], color: COLOR_ESTADO[e] }))}
          />
        </Card>
      </div>
    </div>
  );
}

export default InicioAdmin;
