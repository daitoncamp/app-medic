import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  faBellSlash, faCheck, faCircleExclamation, faCommentDots, faCopy,
} from '@fortawesome/free-solid-svg-icons';
import {
  Badge, Button, Card, EmptyState, Field, IconButton, PageHeader, Table, useToast,
} from '../../components/ui';
import { useRecurso } from '../../hooks/useRecurso';
import { fechaLocalISO } from '../../services/clinica';
import {
  enlaceWhatsApp, listarRecordatorios, marcarRecordatorioEnviado, mensajeRecordatorio,
} from '../../services/recordatoriosApi';
import { fechaLarga, formatearFechaHora } from '../../utils/formato';
import styles from './Recordatorios.module.css';

const sumarDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return fechaLocalISO(d);
};

/**
 * Recordatorios de las citas de mañana (o del día que se elija).
 * Recepción abre WhatsApp con el mensaje listo y luego marca el envío,
 * así el equipo sabe a quién ya se avisó.
 */
function RecordatoriosPage() {
  const toast = useToast();
  const [fecha, setFecha] = useState(() => sumarDias(1));
  const [abiertos, setAbiertos] = useState({}); // citas cuyo WhatsApp ya se abrió
  const { datos, cargando, error, recargar } = useRecurso(() => listarRecordatorios(fecha), [fecha]);
  const citas = datos?.fecha === fecha ? datos.citas : [];

  const abrirWhatsApp = (cita) => {
    window.open(enlaceWhatsApp(cita.telefono, mensajeRecordatorio(cita)), '_blank', 'noopener');
    setAbiertos((a) => ({ ...a, [cita.id]: true }));
  };

  const marcar = async (cita) => {
    try {
      await marcarRecordatorioEnviado(cita.id);
      toast.success(`Recordatorio de ${cita.paciente} registrado.`);
      recargar();
    } catch (e) {
      toast.error(e.message);
      recargar();
    }
  };

  const copiar = async (cita) => {
    try {
      await navigator.clipboard.writeText(mensajeRecordatorio(cita));
      toast.success('Mensaje copiado.');
    } catch {
      toast.error('No se pudo copiar el mensaje.');
    }
  };

  const columnas = [
    { key: 'hora', header: 'Hora', className: 'strong' },
    {
      key: 'paciente',
      header: 'Paciente',
      render: (c) => (
        <>
          <Link to={`/pacientes/${c.cedula}`} className={styles.link}>{c.paciente}</Link>
          <span className={styles.meta}>{c.telefono}{Number(c.edad) < 18 ? ' · menor de edad' : ''}</span>
        </>
      ),
    },
    { key: 'consulta', header: 'Consulta' },
    {
      key: 'recordatorio',
      header: 'Recordatorio',
      render: (c) => (c.recordatorio
        ? <Badge tone="success">Enviado {formatearFechaHora(c.recordatorio.enviadoEn)}</Badge>
        : <Badge tone="warning">Pendiente</Badge>),
    },
    {
      key: 'acciones',
      header: '',
      className: 'actions',
      render: (c) => (
        <span className={styles.actions}>
          <IconButton icon={faCopy} label={`Copiar mensaje para ${c.paciente}`} onClick={() => copiar(c)} />
          {abiertos[c.id] && !c.recordatorio ? (
            <Button size="sm" icon={faCheck} onClick={() => marcar(c)}>Marcar enviado</Button>
          ) : (
            <Button size="sm" variant={c.recordatorio ? 'ghost' : 'secondary'} icon={faCommentDots} onClick={() => abrirWhatsApp(c)}>
              {c.recordatorio ? 'Reenviar' : 'WhatsApp'}
            </Button>
          )}
        </span>
      ),
    },
  ];

  let contenido;
  if (error && !datos) {
    contenido = (
      <EmptyState icon={faCircleExclamation} title="No se pudieron cargar las citas" text={error.message}
        action={<Button variant="secondary" onClick={recargar}>Reintentar</Button>} />
    );
  } else if (cargando && datos?.fecha !== fecha) {
    contenido = <EmptyState compact title="Cargando citas…" />;
  } else {
    contenido = (
      <Table
        caption={`Citas: ${fechaLarga(`${fecha}T12:00:00`)}`}
        columns={columnas}
        rows={citas}
        empty={<EmptyState icon={faBellSlash} title="No hay citas pendientes ese día" text="Solo aparecen las citas pendientes o confirmadas." />}
      />
    );
  }

  const pendientes = citas.filter((c) => !c.recordatorio).length;

  return (
    <>
      <PageHeader
        title="Recordatorios"
        subtitle="Avisa por WhatsApp a los pacientes que tienen cita."
      />

      <Card padded={false}>
        <div className={styles.toolbar}>
          <div className={styles.dias} role="group" aria-label="Día de las citas">
            {[[1, 'Mañana'], [2, 'Pasado mañana']].map(([dias, label]) => (
              <Button
                key={dias}
                size="sm"
                variant={fecha === sumarDias(dias) ? 'primary' : 'secondary'}
                onClick={() => setFecha(sumarDias(dias))}
              >
                {label}
              </Button>
            ))}
            <Field label="Otro día" type="date" min={fechaLocalISO()} value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
          </div>
          {citas.length > 0 && (
            <p className={styles.resumen}>
              {pendientes ? `${pendientes} de ${citas.length} sin avisar` : `Todos avisados (${citas.length})`}
            </p>
          )}
        </div>
        {contenido}
      </Card>

      <p className={styles.nota}>
        El botón abre WhatsApp (en el celular o en WhatsApp Web) con el mensaje escrito; solo hay que enviarlo.
        Después, marca el envío para que el resto del equipo sepa que ya se avisó.
      </p>
    </>
  );
}

export default RecordatoriosPage;
