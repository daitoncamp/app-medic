import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  faBellSlash, faCheck, faCircleExclamation, faCommentDots, faCommentSms, faCopy,
} from '@fortawesome/free-solid-svg-icons';
import {
  Badge, Button, Card, EmptyState, Field, IconButton, PageHeader, Table, useToast,
} from '../../components/ui';
import { useRecurso } from '../../hooks/useRecurso';
import { fechaLocalISO } from '../../services/clinica';
import {
  enlaceSMS, enlaceWhatsApp, listarRecordatorios, marcarRecordatorioEnviado, mensajeRecordatorio, mensajeSMS,
} from '../../services/recordatoriosApi';
import { fechaLarga, formatearFechaHora } from '../../utils/formato';
import styles from './Recordatorios.module.css';

const NOMBRE_CANAL = { WHATSAPP: 'WhatsApp', SMS: 'SMS', CORREO: 'correo' };

const sumarDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return fechaLocalISO(d);
};

/**
 * Recordatorios de las citas de mañana (o del día que se elija).
 * Recepción abre WhatsApp o la app de mensajes (SMS) con el mensaje listo y
 * luego marca el envío, así el equipo sabe a quién ya se avisó y por dónde.
 */
function RecordatoriosPage() {
  const toast = useToast();
  const [fecha, setFecha] = useState(() => sumarDias(1));
  const [abiertos, setAbiertos] = useState({}); // { citaId: 'WHATSAPP' | 'SMS' }: canal que se abrió
  const { datos, cargando, error, recargar } = useRecurso(() => listarRecordatorios(fecha), [fecha]);
  const citas = datos?.fecha === fecha ? datos.citas : [];

  const abrirWhatsApp = (cita) => {
    window.open(enlaceWhatsApp(cita.telefono, mensajeRecordatorio(cita)), '_blank', 'noopener');
    setAbiertos((a) => ({ ...a, [cita.id]: 'WHATSAPP' }));
  };

  // sms: abre la app de mensajes del celular (en la computadora, solo si hay una vinculada)
  const abrirSMS = (cita) => {
    window.location.href = enlaceSMS(cita.telefono, mensajeSMS(cita));
    setAbiertos((a) => ({ ...a, [cita.id]: 'SMS' }));
  };

  const marcar = async (cita, canal) => {
    try {
      await marcarRecordatorioEnviado(cita.id, canal);
      toast.success(`Recordatorio por ${NOMBRE_CANAL[canal]} de ${cita.paciente} registrado.`);
      recargar();
    } catch (e) {
      toast.error(e.message);
      recargar();
    }
  };

  const copiar = async (cita) => {
    try {
      // El mensaje corto sirve para cualquier canal
      await navigator.clipboard.writeText(mensajeSMS(cita));
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
        ? <Badge tone="success">{NOMBRE_CANAL[c.recordatorio.canal]} · {formatearFechaHora(c.recordatorio.enviadoEn)}</Badge>
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
            <>
              <Button size="sm" icon={faCheck} onClick={() => marcar(c, abiertos[c.id])}>
                Marcar enviado por {NOMBRE_CANAL[abiertos[c.id]]}
              </Button>
              <IconButton
                icon={abiertos[c.id] === 'SMS' ? faCommentDots : faCommentSms}
                label={abiertos[c.id] === 'SMS' ? 'Usar WhatsApp' : 'Usar SMS'}
                onClick={() => (abiertos[c.id] === 'SMS' ? abrirWhatsApp(c) : abrirSMS(c))}
              />
            </>
          ) : (
            <>
              <Button size="sm" variant={c.recordatorio ? 'ghost' : 'secondary'} icon={faCommentDots} onClick={() => abrirWhatsApp(c)}>
                WhatsApp
              </Button>
              <Button size="sm" variant={c.recordatorio ? 'ghost' : 'secondary'} icon={faCommentSms} onClick={() => abrirSMS(c)}>
                SMS
              </Button>
            </>
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
        subtitle="Avisa por WhatsApp o por mensaje de texto a los pacientes que tienen cita."
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
        WhatsApp se abre en el celular o en WhatsApp Web con el mensaje escrito. SMS abre la app de mensajes
        del celular con un texto corto y sin tildes, para que se cobre como un solo mensaje; en la computadora
        solo funciona si hay una app de mensajes vinculada al celular (si no, copia el mensaje).
        Después de enviarlo, marca el envío para que el resto del equipo sepa que ya se avisó.
      </p>
    </>
  );
}

export default RecordatoriosPage;
