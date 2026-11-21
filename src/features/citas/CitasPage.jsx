import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  faCalendarDay, faCheck, faDownload, faEnvelope, faPen, faPhone, faPlus, faTrash, faUserPlus, faUserXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
  Button, Card, EmptyState, EstadoCita, Field, IconButton, PageHeader, SearchInput, Table,
  useConfirm, useToast,
} from '../../components/ui';
import { useClinica } from '../../hooks/useClinica';
import {
  actualizarCita, confirmarCita, eliminarCita, ESTADOS_CITA, fechaLocalISO, marcarNoAsistio,
  obtenerListaPacientes, registrarNuevaCita, registrarNuevoPaciente,
} from '../../services/clinica';
import { formatearFecha } from '../../utils/formato';
import CitaFormModal from './CitaFormModal';
import RegistroRapidoModal from './RegistroRapidoModal';
import styles from './Citas.module.css';

const ESTADOS_ABIERTOS = [ESTADOS_CITA.PENDIENTE, ESTADOS_CITA.CONFIRMADA];

function CitasPage() {
  const datos = useClinica();
  const toast = useToast();
  const confirmar = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState('');
  const [fecha, setFecha] = useState(fechaLocalISO());
  const [estado, setEstado] = useState('');
  // Se abre directo si se llegó desde "Nueva cita" del inicio
  const [modal, setModal] = useState(location.state?.nuevaCita ? { tipo: 'cita' } : null);

  const texto = busqueda.trim().toLowerCase();
  const citas = datos.citasDelDia
    .filter((c) => !fecha || c.fecha === fecha)
    .filter((c) => !estado || c.estado === estado)
    .filter((c) => !texto || c.paciente.toLowerCase().includes(texto) || c.cedula.includes(texto))
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));

  const cerrarModal = () => {
    setModal(null);
    if (location.state?.nuevaCita) navigate('.', { replace: true, state: null });
  };

  const guardarCita = (form) => {
    const ok = modal.cita
      ? actualizarCita(modal.cita.id, form)
      : registrarNuevaCita(form);
    if (!ok) return toast.error('No se pudo guardar la cita.');
    const enviada = form.estado === ESTADOS_CITA.CONFIRMADA && !modal.cita?.enEnfermeria;
    toast.success(modal.cita ? 'Cita actualizada.' : `Cita agendada${enviada ? ' y enviada a enfermería' : ''}.`);
    if (!modal.cita) setFecha(form.fecha);
    cerrarModal();
  };

  const guardarRegistro = (form) => {
    if (!registrarNuevoPaciente(form)) return toast.error('No se pudo registrar al paciente.');
    toast.success(`${form.nombre} pasó a la sala de espera de enfermería.`);
    setFecha(fechaLocalISO());
    cerrarModal();
  };

  const alConfirmar = (cita) => {
    if (confirmarCita(cita.id)) toast.success(`${cita.paciente} pasó a la sala de espera de enfermería.`);
  };

  const alNoAsistir = async (cita) => {
    const ok = await confirmar({
      title: '¿Marcar como no asistió?',
      message: `${cita.paciente} · ${formatearFecha(cita.fecha)} ${cita.hora}. Saldrá de la sala de espera si estaba en ella.`,
      confirmText: 'Marcar',
    });
    if (ok && marcarNoAsistio(cita.id)) toast.info('Cita marcada como no asistió.');
  };

  const alEliminar = async (cita) => {
    const ok = await confirmar({
      title: '¿Eliminar la cita?',
      message: `${cita.paciente} · ${formatearFecha(cita.fecha)} ${cita.hora}. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (ok && eliminarCita(cita.id)) toast.success('Cita eliminada.');
  };

  const descargarReporte = () => {
    const reporte = {
      generado: new Date().toISOString(),
      filtro: { fecha: fecha || 'todas', estado: estado || 'todos', busqueda },
      total: citas.length,
      citas,
      pacientes: obtenerListaPacientes(datos),
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
          <span className={styles.patientId}>{c.cedula}</span>
        </div>
      ),
    },
    { key: 'consulta', header: 'Consulta' },
    { key: 'estado', header: 'Estado', render: (c) => <EstadoCita estado={c.estado} /> },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'actions',
      render: (c) => (
        <div className={styles.actions}>
          {c.estado === ESTADOS_CITA.PENDIENTE && (
            <IconButton icon={faCheck} label="Confirmar y enviar a enfermería" onClick={() => alConfirmar(c)} className={styles.confirm} />
          )}
          {ESTADOS_ABIERTOS.includes(c.estado) && (
            <IconButton icon={faUserXmark} label="Marcar como no asistió" onClick={() => alNoAsistir(c)} />
          )}
          <IconButton icon={faPen} label="Editar cita" onClick={() => setModal({ tipo: 'cita', cita: c })} />
          <IconButton as="a" href={`tel:${c.telefono}`} icon={faPhone} label={`Llamar al ${c.telefono}`} />
          <IconButton as="a" href={`mailto:${c.email}`} icon={faEnvelope} label={`Escribir a ${c.email}`} />
          <IconButton icon={faTrash} label="Eliminar cita" onClick={() => alEliminar(c)} className={styles.delete} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Citas"
        subtitle="Agenda, confirma y da seguimiento a las citas."
        actions={(
          <>
            <Button variant="secondary" icon={faUserPlus} onClick={() => setModal({ tipo: 'registro' })}>Registro rápido</Button>
            <Button icon={faPlus} onClick={() => setModal({ tipo: 'cita' })}>Nueva cita</Button>
          </>
        )}
      />

      <Card padded={false}>
        <div className={styles.toolbar}>
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre o cédula" />
          <div className={styles.filters}>
            <Field type="date" aria-label="Fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <Field as="select" aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.values(ESTADOS_CITA).map((e) => <option key={e}>{e}</option>)}
            </Field>
            {fecha && <Button variant="ghost" size="sm" onClick={() => setFecha('')}>Todas las fechas</Button>}
            <IconButton icon={faDownload} label="Descargar reporte (JSON)" variant="secondary" onClick={descargarReporte} />
          </div>
        </div>

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
        {citas.length > 0 && <p className={styles.count}>{citas.length} {citas.length === 1 ? 'cita' : 'citas'}</p>}
      </Card>

      {modal?.tipo === 'cita' && (
        <CitaFormModal open cita={modal.cita} onClose={cerrarModal} onGuardar={guardarCita} />
      )}
      {modal?.tipo === 'registro' && (
        <RegistroRapidoModal open onClose={cerrarModal} onGuardar={guardarRegistro} />
      )}
    </>
  );
}

export default CitasPage;
