import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  faCircleExclamation, faClipboardList, faEye, faHeartPulse, faStethoscope, faUsers,
} from '@fortawesome/free-solid-svg-icons';
import {
  AlertList, Badge, Button, Card, EmptyState, Modal, PageHeader, SearchInput, Table, Tabs, useToast,
} from '../../components/ui';
import { useRecurso } from '../../hooks/useRecurso';
import { obtenerSala, registrarSignos } from '../../services/enfermeriaApi';
import { formatearFechaHora } from '../../utils/formato';
import { mencionaAlergia } from '../../utils/signosVitales';
import { minutosDesde } from '../dashboard/metricas';
import SignosVitalesForm from './SignosVitalesForm';
import styles from './Enfermeria.module.css';

const SALA_VACIA = { enEspera: [], preparados: [], alertasHoy: [], ultimasAtenciones: [], metricas: {} };
const ESPERA_LARGA = 20; // minutos

const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function EnfermeriaPage() {
  const toast = useToast();
  const [pestana, setPestana] = useState('espera');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionadoId, setSeleccionadoId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const formularioRef = useRef(null);

  const tomarSignos = (id) => {
    setSeleccionadoId(id);
    // En pantallas angostas el formulario queda debajo de la lista
    if (window.matchMedia('(max-width: 1100px)').matches) {
      formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Se actualiza cada 15 s para ver a los pacientes que confirma recepción
  const { datos, cargando, error, recargar } = useRecurso(obtenerSala, [], { intervalo: 15000, inicial: SALA_VACIA });
  const sala = datos || SALA_VACIA;

  const texto = normalizar(busqueda.trim());
  const filtrar = (lista) => lista.filter((p) => !texto || normalizar(p.paciente).includes(texto) || p.cedula?.includes(texto));
  const enEspera = filtrar(sala.enEspera);
  const preparados = filtrar(sala.preparados);

  // Si el paciente seleccionado ya no está en espera (lo atendió otra persona), se deselecciona
  const actual = seleccionadoId && sala.enEspera.find((p) => p.id === seleccionadoId);

  const guardar = async (signos) => {
    try {
      const { alertas } = await registrarSignos(actual.id, signos);
      if (alertas.length) {
        toast.info(`${actual.paciente} pasó a odontología con ${alertas.length} ${alertas.length === 1 ? 'alerta médica' : 'alertas médicas'}.`, 6000);
      } else {
        toast.success(`${actual.paciente} está listo para odontología.`);
      }
      setSeleccionadoId(null);
      recargar();
    } catch (e) {
      if (e.status === 409) {
        // Otra enfermera ya lo registró: se refresca la sala
        toast.error(e.message);
        setSeleccionadoId(null);
        recargar();
        return;
      }
      if (!e.detalles) toast.error(e.message || 'No se pudieron guardar los signos vitales.');
      throw e; // el formulario muestra los errores por campo
    }
  };

  const columnasEspera = [
    { key: 'hora', header: 'Cita', className: 'strong' },
    {
      key: 'paciente',
      header: 'Paciente',
      render: (p) => (
        <>
          <Link to={`/pacientes/${p.cedula}`} className={styles.link}>{p.paciente}</Link>
          {p.antecedentes.some((a) => a.tipo === 'ALERGIA') && <> <Badge tone="danger">Alergia</Badge></>}
        </>
      ),
    },
    { key: 'consulta', header: 'Consulta' },
    {
      key: 'espera',
      header: 'Esperando',
      render: (p) => {
        const min = minutosDesde(p.llegadaEn);
        return min === null ? '—' : <Badge tone={min >= ESPERA_LARGA ? 'danger' : 'neutral'}>{min} min</Badge>;
      },
    },
    {
      key: 'acciones',
      header: '',
      className: 'actions',
      render: (p) => (
        <Button
          size="sm"
          icon={faStethoscope}
          variant={actual?.id === p.id ? 'primary' : 'secondary'}
          onClick={() => tomarSignos(p.id)}
        >
          {actual?.id === p.id ? 'Atendiendo' : 'Tomar signos'}
        </Button>
      ),
    },
  ];

  const columnasPreparados = [
    { key: 'hora', header: 'Cita', className: 'strong' },
    { key: 'paciente', header: 'Paciente' },
    { key: 'presion', header: 'Presión', render: (p) => p.signosVitales?.presion },
    {
      key: 'alertas',
      header: 'Alertas',
      render: (p) => {
        const n = p.alertas.length;
        return n ? <Badge tone="danger">{n} {n === 1 ? 'alerta' : 'alertas'}</Badge> : <Badge tone="success">Sin alertas</Badge>;
      },
    },
    {
      key: 'acciones',
      header: '',
      className: 'actions',
      render: (p) => <Button size="sm" variant="ghost" icon={faEye} onClick={() => setDetalle(p)}>Ver</Button>,
    },
  ];

  let tabla;
  if (error && !datos?.enEspera.length && !datos?.preparados.length) {
    tabla = (
      <EmptyState icon={faCircleExclamation} title="No se pudo cargar la sala de espera" text={error.message}
        action={<Button variant="secondary" onClick={recargar}>Reintentar</Button>} />
    );
  } else if (cargando && !sala.enEspera.length && !sala.preparados.length) {
    tabla = <EmptyState compact title="Cargando sala de espera…" />;
  } else if (pestana === 'espera') {
    tabla = (
      <Table
        caption="Pacientes en espera"
        columns={columnasEspera}
        rows={enEspera}
        empty={<EmptyState icon={faUsers} title="No hay pacientes en espera" text="Cuando recepción confirme una cita, el paciente aparecerá aquí." />}
      />
    );
  } else {
    tabla = (
      <Table
        caption="Pacientes preparados"
        columns={columnasPreparados}
        rows={preparados}
        empty={<EmptyState icon={faClipboardList} title="Nadie preparado todavía" />}
      />
    );
  }

  return (
    <>
      <PageHeader title="Enfermería" subtitle="Toma los signos vitales y envía a los pacientes a odontología." />

      <div className={styles.layout}>
        <Card padded={false} className={styles.main}>
          <div className={styles.toolbar}>
            <Tabs
              label="Pacientes"
              value={pestana}
              onChange={setPestana}
              items={[
                { id: 'espera', label: 'En espera', count: sala.enEspera.length },
                { id: 'preparados', label: 'Preparados', count: sala.preparados.length },
              ]}
            />
            <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar paciente" />
          </div>
          {tabla}
        </Card>

        <div className={styles.side} ref={formularioRef}>
          <Card title="Signos vitales" icon={faHeartPulse}>
            {actual ? (
              <SignosVitalesForm key={actual.id} paciente={actual} onGuardar={guardar} onCancelar={() => setSeleccionadoId(null)} />
            ) : (
              <EmptyState compact icon={faStethoscope} title="Ningún paciente seleccionado" text="Elige “Tomar signos” en la sala de espera." />
            )}
          </Card>

          <Card title="Alertas de hoy" icon={faCircleExclamation} iconTone="danger" padded={false}>
            {sala.alertasHoy.length ? (
              <div className={styles.alertsBody}>
                <AlertList alertas={sala.alertasHoy} mostrarPaciente compact />
              </div>
            ) : (
              <EmptyState compact title="Sin alertas" />
            )}
          </Card>
        </div>
      </div>

      <Card title="Últimas atenciones" subtitle="Los 10 registros de signos más recientes" padded={false} className={styles.history}>
        <Table
          caption="Historial de atenciones"
          columns={[
            { key: 'fecha', header: 'Fecha', render: (a) => formatearFechaHora(a.fecha) },
            { key: 'paciente', header: 'Paciente', className: 'strong' },
            { key: 'tratamiento', header: 'Consulta' },
            {
              key: 'observaciones',
              header: 'Observaciones',
              render: (a) => (mencionaAlergia(a.observaciones) ? <Badge tone="danger">{a.observaciones}</Badge> : a.observaciones),
            },
            { key: 'registradoPor', header: 'Registró' },
          ]}
          rows={sala.ultimasAtenciones}
          empty={<EmptyState compact title="Sin atenciones registradas" />}
        />
      </Card>

      <Modal
        open={Boolean(detalle)}
        onClose={() => setDetalle(null)}
        title={detalle?.paciente}
        description={detalle && `${detalle.edad} años · ${detalle.sexo} · ${detalle.consulta}`}
      >
        {detalle && (
          <dl className={styles.details}>
            <div><dt>Presión arterial</dt><dd>{detalle.signosVitales?.presion} mmHg</dd></div>
            <div><dt>Pulso</dt><dd>{detalle.signosVitales?.pulso}</dd></div>
            <div><dt>Temperatura</dt><dd>{detalle.signosVitales?.temperatura}</dd></div>
            <div><dt>Frecuencia respiratoria</dt><dd>{detalle.signosVitales?.frecuenciaRespiratoria || 'No registrada'}</dd></div>
            <div><dt>Saturación de oxígeno</dt><dd>{detalle.signosVitales?.saturacion || 'No registrada'}</dd></div>
            <div><dt>Preparado</dt><dd>{formatearFechaHora(detalle.preparadaEn)}</dd></div>
            <div><dt>Registró</dt><dd>{detalle.signosVitales?.registradoPor}</dd></div>
            <div className={styles.detailsWide}><dt>Observaciones</dt><dd>{detalle.signosVitales?.observaciones}</dd></div>
            {detalle.alertas.length > 0 && (
              <div className={styles.detailsWide}>
                <dt>Alertas médicas</dt>
                <dd><AlertList compact alertas={detalle.alertas} /></dd>
              </div>
            )}
          </dl>
        )}
      </Modal>
    </>
  );
}

export default EnfermeriaPage;
