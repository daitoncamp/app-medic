import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  faCircleExclamation, faClipboardList, faEye, faHeartPulse, faStethoscope, faUsers,
} from '@fortawesome/free-solid-svg-icons';
import {
  Badge, Button, Card, EmptyState, Modal, PageHeader, SearchInput, Table, Tabs, useToast,
} from '../../components/ui';
import { useClinica } from '../../hooks/useClinica';
import { registrarSignosVitales } from '../../services/clinica';
import { formatearFechaHora } from '../../utils/formato';
import { alertasDeHoy, minutosDesde } from '../dashboard/metricas';
import SignosVitalesForm from './SignosVitalesForm';
import styles from './Enfermeria.module.css';

function EnfermeriaPage() {
  const datos = useClinica();
  const toast = useToast();
  const [pestana, setPestana] = useState('espera');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [detalle, setDetalle] = useState(null);

  const texto = busqueda.trim().toLowerCase();
  const filtrar = (lista) => lista.filter((p) => !texto || p.paciente.toLowerCase().includes(texto) || p.cedula?.includes(texto));
  const enEspera = filtrar([...datos.pacientesEnEspera].sort((a, b) => String(a.fechaLlegada).localeCompare(String(b.fechaLlegada))));
  const preparados = filtrar(datos.pacientesPreparados);
  const alertas = alertasDeHoy(datos);
  const historial = [...datos.historialAtenciones].reverse().slice(0, 10);

  // Si el paciente seleccionado ya no está en espera (lo atendió otra persona), se deselecciona
  const actual = seleccionado && datos.pacientesEnEspera.find((p) => p.id === seleccionado.id);

  const guardar = (signos) => {
    if (registrarSignosVitales(actual, signos)) {
      toast.success(`${actual.paciente} está listo para odontología.`);
      setSeleccionado(null);
    } else {
      toast.error('No se pudieron guardar los signos vitales.');
    }
  };

  const columnasEspera = [
    { key: 'hora', header: 'Cita', className: 'strong' },
    {
      key: 'paciente',
      header: 'Paciente',
      render: (p) => <Link to={`/pacientes/${p.cedula}`} className={styles.link}>{p.paciente}</Link>,
    },
    { key: 'consulta', header: 'Consulta' },
    {
      key: 'espera',
      header: 'Esperando',
      render: (p) => {
        const min = minutosDesde(p.fechaLlegada);
        return min === null ? '—' : <Badge tone={min >= 20 ? 'danger' : 'neutral'}>{min} min</Badge>;
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
          onClick={() => setSeleccionado(p)}
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
    { key: 'estado', header: 'Estado', render: () => <Badge tone="success">Preparado</Badge> },
    {
      key: 'acciones',
      header: '',
      className: 'actions',
      render: (p) => <Button size="sm" variant="ghost" icon={faEye} onClick={() => setDetalle(p)}>Ver</Button>,
    },
  ];

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
                { id: 'espera', label: 'En espera', count: datos.pacientesEnEspera.length },
                { id: 'preparados', label: 'Preparados', count: datos.pacientesPreparados.length },
              ]}
            />
            <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar paciente" />
          </div>

          {pestana === 'espera' ? (
            <Table
              caption="Pacientes en espera"
              columns={columnasEspera}
              rows={enEspera}
              empty={<EmptyState icon={faUsers} title="No hay pacientes en espera" text="Cuando recepción confirme una cita, el paciente aparecerá aquí." />}
            />
          ) : (
            <Table
              caption="Pacientes preparados"
              columns={columnasPreparados}
              rows={preparados}
              empty={<EmptyState icon={faClipboardList} title="Nadie preparado todavía" />}
            />
          )}
        </Card>

        <div className={styles.side}>
          <Card title="Signos vitales" icon={faHeartPulse}>
            {actual ? (
              <SignosVitalesForm key={actual.id} paciente={actual} onGuardar={guardar} onCancelar={() => setSeleccionado(null)} />
            ) : (
              <EmptyState compact icon={faStethoscope} title="Ningún paciente seleccionado" text="Elige “Tomar signos” en la sala de espera." />
            )}
          </Card>

          <Card title="Alertas de hoy" icon={faCircleExclamation} iconTone="danger" padded={false}>
            {alertas.length ? (
              alertas.map((a) => (
                <div key={a.id} className={styles.alert}>
                  <strong>{a.paciente}</strong>
                  <p>{a.descripcion}</p>
                </div>
              ))
            ) : (
              <EmptyState compact title="Sin alertas" />
            )}
          </Card>
        </div>
      </div>

      <Card title="Últimas atenciones" subtitle="Las 10 más recientes" padded={false} className={styles.history}>
        <Table
          caption="Historial de atenciones"
          columns={[
            { key: 'fecha', header: 'Fecha', render: (a) => formatearFechaHora(a.fecha) },
            { key: 'paciente', header: 'Paciente', className: 'strong' },
            { key: 'tratamiento', header: 'Consulta' },
            {
              key: 'observaciones',
              header: 'Observaciones',
              render: (a) => (/alerg/i.test(a.observaciones) ? <Badge tone="danger">{a.observaciones}</Badge> : a.observaciones),
            },
          ]}
          rows={historial}
          empty={<EmptyState compact title="Sin atenciones registradas" />}
        />
      </Card>

      <Modal open={Boolean(detalle)} onClose={() => setDetalle(null)} title={detalle?.paciente} description={detalle && `${detalle.edad} años · ${detalle.sexo} · ${detalle.consulta}`}>
        {detalle && (
          <dl className={styles.details}>
            <div><dt>Presión arterial</dt><dd>{detalle.signosVitales?.presion}</dd></div>
            <div><dt>Pulso</dt><dd>{detalle.signosVitales?.pulso}</dd></div>
            <div><dt>Temperatura</dt><dd>{detalle.signosVitales?.temperatura}</dd></div>
            <div><dt>Preparado</dt><dd>{formatearFechaHora(detalle.fechaPreparacion)}</dd></div>
            <div className={styles.detailsWide}><dt>Observaciones</dt><dd>{detalle.signosVitales?.observaciones}</dd></div>
          </dl>
        )}
      </Modal>
    </>
  );
}

export default EnfermeriaPage;
