import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  faBan, faCalendarDay, faCheck, faChevronLeft, faChevronRight, faCircleExclamation, faDownload, faEnvelope,
  faFileMedical, faPen, faPhone, faPlus, faUserPlus, faUserXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
  Button, Card, EmptyState, EstadoCita, Field, IconButton, Modal, PageHeader, SearchInput, Table, Tabs,
  useConfirm, useToast,
} from '../../components/ui';
import { useDiferido } from '../../hooks/useDiferido';
import { useRecurso } from '../../hooks/useRecurso';
import { ESTADOS_CITA, fechaLocalISO } from '../../services/clinica';
import {
  agendarCita, anularCita, confirmarCita, editarCita, listarCitas, marcarNoAsistio, registrarSinCita,
} from '../../services/recepcionApi';
import { formatearFecha } from '../../utils/formato';
import CalendarioCitas from './CalendarioCitas';
import {
  rangoVista, sumarDias, sumarMeses, tituloVista,
} from './calendario';
import CitaFormModal from './CitaFormModal';
import RegistroRapidoModal from './RegistroRapidoModal';
import styles from './Citas.module.css';

const ESTADOS_ABIERTOS = [ESTADOS_CITA.PENDIENTE, ESTADOS_CITA.CONFIRMADA];
const ACTUALIZAR_CADA_MS = 30000;

function CitasPage() {
  const toast = useToast();
  const confirmar = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState('');
  const [fecha, setFecha] = useState(fechaLocalISO());
  const [estado, setEstado] = useState('');
  // Se abre directo si se llegó desde "Nueva cita" del inicio
  const [modal, setModal] = useState(location.state?.nuevaCita ? { tipo: 'cita' } : null);
  const [anulando, setAnulando] = useState(null);
  // Vista: lista de un día (o todas), semana o mes
  const [vista, setVista] = useState('lista');
  const [fechaCalendario, setFechaCalendario] = useState(fechaLocalISO());
  const [detalle, setDetalle] = useState(null); // cita abierta desde el calendario
  const enCalendario = vista !== 'lista';

  // Se vuelve a pedir al cambiar los filtros y cada 30 s (para ver lo que hacen otras computadoras)
  const buscar = useDiferido(busqueda);
  const lista = useRecurso(
    () => (enCalendario
      ? Promise.resolve([])
      : listarCitas({ fecha: fecha || undefined, todas: !fecha, estado: estado || undefined, buscar })),
    [enCalendario, fecha, estado, buscar],
    { intervalo: ACTUALIZAR_CADA_MS, inicial: [] },
  );
  const rango = rangoVista(vista, fechaCalendario);
  const calendario = useRecurso(
    () => (enCalendario
      ? listarCitas({ ...rango, estado: estado || undefined, buscar })
      : Promise.resolve([])),
    [enCalendario, rango.desde, rango.hasta, estado, buscar],
    { intervalo: ACTUALIZAR_CADA_MS, inicial: [] },
  );
  const { datos: citas, cargando, error } = enCalendario ? calendario : lista;
  const recargar = () => {
    lista.recargar();
    calendario.recargar();
  };

  const moverCalendario = (paso) => setFechaCalendario((f) => (vista === 'semana' ? sumarDias(f, 7 * paso) : sumarMeses(f, paso)));

  // Desde el calendario, tocar un día abre la lista de ese día
  const verDia = (dia) => {
    setFecha(dia);
    setVista('lista');
  };

  const cerrarModal = () => {
    setModal(null);
    if (location.state?.nuevaCita) navigate('.', { replace: true, state: null });
  };

  // Los modales esperan esta promesa: si falla, muestran el error en el formulario
  const guardarCita = async (form) => {
    if (modal.cita) {
      await editarCita(modal.cita.id, form);
      toast.success('Cita actualizada.');
    } else {
      const cita = await agendarCita(form);
      toast.success(cita.estado === ESTADOS_CITA.CONFIRMADA ? 'Cita registrada y enviada a enfermería.' : 'Cita agendada.');
      setFecha(cita.fecha);
      setFechaCalendario(cita.fecha);
    }
    cerrarModal();
    recargar();
  };

  const guardarRegistro = async (form) => {
    const cita = await registrarSinCita(form);
    toast.success(`${cita.paciente} pasó a la sala de espera de enfermería.`);
    setFecha(fechaLocalISO());
    cerrarModal();
    recargar();
  };

  const ejecutar = async (accion, mensaje) => {
    try {
      await accion();
      toast.success(mensaje);
      recargar();
    } catch (e) {
      toast.error(e.message);
      recargar();
    }
  };

  const alConfirmar = (cita) => ejecutar(() => confirmarCita(cita.id), `${cita.paciente} pasó a la sala de espera de enfermería.`);

  const alNoAsistir = async (cita) => {
    const ok = await confirmar({
      title: '¿Marcar como no asistió?',
      message: `${cita.paciente} · ${formatearFecha(cita.fecha)} ${cita.hora}. Saldrá de la sala de espera si estaba en ella.`,
      confirmText: 'Marcar',
    });
    if (ok) ejecutar(() => marcarNoAsistio(cita.id), 'Cita marcada como no asistió.');
  };

  const descargarReporte = () => {
    const reporte = {
      generado: new Date().toISOString(),
      filtro: { fecha: fecha || 'todas', estado: estado || 'todos', busqueda },
      total: citas.length,
      citas: citas.map(({ datosPaciente, ...c }) => ({ ...c, fechaNacimiento: datosPaciente?.fechaNacimiento })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(reporte, null, 2)], { type: 'application/json' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `reporte_citas_${fecha || 'todas'}.json`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const columnas = [
    {
      key: 'hora',
      header: 'Hora',
      className: 'strong',
      render: (c) => (fecha ? c.hora : `${formatearFecha(c.fecha)} · ${c.hora}`),
    },
    {
      key: 'paciente',
      header: 'Paciente',
      render: (c) => (
        <div className={styles.patient}>
          <Link to={`/pacientes/${c.cedula}`} className={styles.patientName}>{c.paciente}</Link>
          <span className={styles.patientId}>{c.cedula}{c.edad !== undefined && ` · ${c.edad} años`}</span>
        </div>
      ),
    },
    { key: 'consulta', header: 'Consulta' },
    {
      key: 'estado',
      header: 'Estado',
      render: (c) => (
        <span title={c.motivoAnulacion ? `Motivo: ${c.motivoAnulacion}` : undefined}>
          <EstadoCita estado={c.estado} />
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'actions',
      render: (c) => {
        const abierta = ESTADOS_ABIERTOS.includes(c.estado);
        return (
          <div className={styles.actions}>
            {c.estado === ESTADOS_CITA.PENDIENTE && (
              <IconButton icon={faCheck} label="El paciente llegó: enviar a enfermería" onClick={() => alConfirmar(c)} className={styles.confirm} />
            )}
            {abierta && <IconButton icon={faUserXmark} label="Marcar como no asistió" onClick={() => alNoAsistir(c)} />}
            {abierta && <IconButton icon={faPen} label="Editar cita" onClick={() => setModal({ tipo: 'cita', cita: c })} />}
            {c.telefono && <IconButton as="a" href={`tel:${c.telefono}`} icon={faPhone} label={`Llamar al ${c.telefono}`} />}
            {c.email && <IconButton as="a" href={`mailto:${c.email}`} icon={faEnvelope} label={`Escribir a ${c.email}`} />}
            {abierta && <IconButton icon={faBan} label="Anular cita" onClick={() => setAnulando(c)} className={styles.delete} />}
          </div>
        );
      },
    },
  ];

  let contenido;
  if (error && !citas.length) {
    contenido = (
      <EmptyState icon={faCircleExclamation} title="No se pudieron cargar las citas" text={error.message}
        action={<Button variant="secondary" onClick={recargar}>Reintentar</Button>} />
    );
  } else if (cargando && !citas.length) {
    contenido = <EmptyState compact title="Cargando citas…" />;
  } else {
    contenido = (
      <Table
        caption="Citas"
        columns={columnas}
        rows={citas}
        empty={(
          <EmptyState
            icon={faCalendarDay}
            title={busqueda || estado ? 'Ninguna cita coincide con el filtro' : 'No hay citas para esta fecha'}
            text="Cambia el filtro o agenda una nueva cita."
            action={<Button icon={faPlus} onClick={() => setModal({ tipo: 'cita' })}>Nueva cita</Button>}
          />
        )}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Citas"
        subtitle="Agenda, confirma la llegada y da seguimiento a las citas."
        actions={(
          <>
            <Button variant="secondary" icon={faUserPlus} onClick={() => setModal({ tipo: 'registro' })}>Registro rápido</Button>
            <Button icon={faPlus} onClick={() => setModal({ tipo: 'cita' })}>Nueva cita</Button>
          </>
        )}
      />

      <Card padded={false}>
        <div className={styles.toolbar}>
          <Tabs
            label="Vista de las citas"
            value={vista}
            onChange={setVista}
            items={[{ id: 'lista', label: 'Lista' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }]}
          />
          {enCalendario && (
            <div className={styles.calNav}>
              <IconButton icon={faChevronLeft} label={vista === 'semana' ? 'Semana anterior' : 'Mes anterior'} onClick={() => moverCalendario(-1)} />
              <Button variant="secondary" size="sm" onClick={() => setFechaCalendario(fechaLocalISO())}>Hoy</Button>
              <IconButton icon={faChevronRight} label={vista === 'semana' ? 'Semana siguiente' : 'Mes siguiente'} onClick={() => moverCalendario(1)} />
              <h2 className={styles.calTitulo} aria-live="polite">{tituloVista(vista, fechaCalendario)}</h2>
            </div>
          )}
        </div>
        <div className={styles.toolbar}>
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre o cédula" />
          <div className={styles.filters}>
            {!enCalendario && <Field type="date" aria-label="Fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} />}
            <Field as="select" aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.values(ESTADOS_CITA).map((e) => <option key={e}>{e}</option>)}
            </Field>
            {!enCalendario && fecha && <Button variant="ghost" size="sm" onClick={() => setFecha('')}>Todas las fechas</Button>}
            {!enCalendario && <IconButton icon={faDownload} label="Descargar reporte (JSON)" variant="secondary" onClick={descargarReporte} />}
          </div>
        </div>
        {enCalendario && !(error && !citas.length) ? (
          <CalendarioCitas
            vista={vista}
            fecha={fechaCalendario}
            citas={citas}
            onCita={setDetalle}
            onDia={verDia}
            onNueva={(dia) => setModal({ tipo: 'cita', fechaInicial: dia })}
          />
        ) : contenido}
        {citas.length > 0 && <p className={styles.count}>{citas.length} {citas.length === 1 ? 'cita' : 'citas'}{enCalendario ? ' en este periodo' : ''}</p>}
      </Card>

      {modal?.tipo === 'cita' && (
        <CitaFormModal open cita={modal.cita} fechaInicial={modal.fechaInicial} onClose={cerrarModal} onGuardar={guardarCita} />
      )}
      {modal?.tipo === 'registro' && (
        <RegistroRapidoModal open onClose={cerrarModal} onGuardar={guardarRegistro} />
      )}
      {detalle && (
        <DetalleCitaModal
          cita={detalle}
          onClose={() => setDetalle(null)}
          onAccion={(accion) => {
            const c = detalle;
            setDetalle(null);
            if (accion === 'llego') alConfirmar(c);
            if (accion === 'noAsistio') alNoAsistir(c);
            if (accion === 'editar') setModal({ tipo: 'cita', cita: c });
            if (accion === 'anular') setAnulando(c);
          }}
        />
      )}
      {anulando && (
        <AnularModal
          cita={anulando}
          onClose={() => setAnulando(null)}
          onAnular={async (motivo) => {
            await anularCita(anulando.id, motivo);
            toast.success('Cita anulada. Queda en el historial con el motivo.');
            setAnulando(null);
            recargar();
          }}
        />
      )}
    </>
  );
}

/** Detalle de una cita abierta desde el calendario, con sus acciones */
function DetalleCitaModal({ cita, onClose, onAccion }) {
  const abierta = ESTADOS_ABIERTOS.includes(cita.estado);
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={cita.paciente}
      description={`${formatearFecha(cita.fecha)} · ${cita.hora} · ${cita.consulta}`}
      footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
    >
      <div className={styles.detalle}>
        <p><EstadoCita estado={cita.estado} /></p>
        {cita.motivoAnulacion && <p className={styles.detalleMotivo}>Motivo: {cita.motivoAnulacion}</p>}
        <p className={styles.patientId}>C.I. {cita.cedula}{cita.edad !== undefined && ` · ${cita.edad} años`}{cita.telefono && ` · ${cita.telefono}`}</p>
        <div className={styles.detalleAcciones}>
          {cita.estado === ESTADOS_CITA.PENDIENTE && (
            <Button size="sm" icon={faCheck} onClick={() => onAccion('llego')}>El paciente llegó</Button>
          )}
          {abierta && <Button size="sm" variant="secondary" icon={faPen} onClick={() => onAccion('editar')}>Editar</Button>}
          {abierta && <Button size="sm" variant="secondary" icon={faUserXmark} onClick={() => onAccion('noAsistio')}>No asistió</Button>}
          {abierta && <Button size="sm" variant="ghost" icon={faBan} onClick={() => onAccion('anular')}>Anular</Button>}
          <Button size="sm" variant="ghost" icon={faFileMedical} as={Link} to={`/pacientes/${cita.cedula}`}>Ver ficha</Button>
          {cita.telefono && <Button size="sm" variant="ghost" icon={faPhone} as="a" href={`tel:${cita.telefono}`}>Llamar</Button>}
        </div>
      </div>
    </Modal>
  );
}

/** Las citas no se borran: se anulan indicando el motivo */
function AnularModal({ cita, onClose, onAnular }) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (motivo.trim().length < 5) {
      setError('Describe el motivo (mínimo 5 caracteres).');
      return;
    }
    setGuardando(true);
    try {
      await onAnular(motivo.trim());
    } catch (err) {
      setError(err.detalles?.motivo || err.message);
      setGuardando(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Anular cita"
      description={`${cita.paciente} · ${formatearFecha(cita.fecha)} ${cita.hora}. La cita no se borra: queda en el historial como anulada.`}
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Volver</Button>
          <Button type="submit" form="form-anular" variant="danger" disabled={guardando}>{guardando ? 'Anulando…' : 'Anular cita'}</Button>
        </>
      )}
    >
      <form id="form-anular" onSubmit={enviar} noValidate>
        <Field
          as="textarea"
          label="Motivo"
          placeholder="Ej.: el paciente pidió reprogramar"
          value={motivo}
          onChange={(e) => { setMotivo(e.target.value); setError(''); }}
          error={error}
        />
      </form>
    </Modal>
  );
}

export default CitasPage;
