import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  faCircleCheck, faFileMedical, faFilePdf, faFloppyDisk, faPrescription, faTooth, faUserClock,
} from '@fortawesome/free-solid-svg-icons';
import {
  Badge, Button, Card, EmptyState, Field, FieldRow, PageHeader, Table, Tabs, useConfirm, useToast,
} from '../../components/ui';
import { useClinica } from '../../hooks/useClinica';
import {
  finalizarConsulta, guardarOdontograma, obtenerHistorialOdontologico, obtenerOdontograma,
  obtenerPacientesOdontologia, registrarDiagnostico,
} from '../../services/clinica';
import { formatearFecha } from '../../utils/formato';
import { requerido, validarFormulario } from '../../utils/validaciones';
import Odontograma from './Odontograma';
import RecetaModal from './RecetaModal';
import { generarHistorialPDF, generarRecetaPDF } from './pdf';
import styles from './Consulta.module.css';

const PROCEDIMIENTOS = ['Limpieza', 'Extracción', 'Resina', 'Corona', 'Endodoncia', 'Ortodoncia', 'Revisión'];
const ESTADOS_HISTORIAL = { completado: ['success', 'Completado'], proceso: ['info', 'En proceso'], pendiente: ['warning', 'Pendiente'] };
const MAX_NOTAS = 300;

const REGLAS = {
  diagnostico: [
    requerido,
    (v) => (/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s,.;:()/-]+$/.test(v) ? '' : 'Contiene caracteres no permitidos.'),
  ],
  diente: [requerido, (v) => (/^\d{2}(\s*,\s*\d{2})*$/.test(v.trim()) ? '' : 'Use números de 2 dígitos separados por comas (ej.: 11, 26).')],
  notas: [(v) => (v.length > MAX_NOTAS ? `Máximo ${MAX_NOTAS} caracteres.` : '')],
};

function ConsultaPage() {
  const datos = useClinica();
  const toast = useToast();
  const confirmar = useConfirm();
  const location = useLocation();

  const agenda = obtenerPacientesOdontologia(datos);
  const [pacienteId, setPacienteId] = useState(location.state?.pacienteId || null);
  const paciente = agenda.find((p) => p.id === pacienteId) || agenda[0] || null;

  const [pestana, setPestana] = useState('diagnostico');
  const [form, setForm] = useState({ diagnostico: '', diente: '', procedimiento: '', notas: '' });
  const [errores, setErrores] = useState({});
  const [receta, setReceta] = useState(false);
  const [fechaPdf, setFechaPdf] = useState('');

  const historial = paciente
    ? [...obtenerHistorialOdontologico(paciente.cedula, datos)].reverse()
    : [];
  const deEstaConsulta = historial.filter((h) => h.pacienteId === paciente?.id);
  const odontograma = paciente ? obtenerOdontograma(paciente.cedula, datos) : {};

  const cambiarPaciente = (p) => {
    setPacienteId(p.id);
    setForm({ diagnostico: '', diente: '', procedimiento: p.tratamiento || '', notas: '' });
    setErrores({});
  };

  const procedimiento = form.procedimiento || paciente?.tratamiento || PROCEDIMIENTOS[0];

  const cambiar = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
  };

  const guardarDiagnostico = (e) => {
    e.preventDefault();
    const nuevos = validarFormulario(form, REGLAS);
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    if (registrarDiagnostico(paciente, { ...form, procedimiento })) {
      toast.success('Diagnóstico guardado.');
      setForm({ diagnostico: '', diente: '', procedimiento, notas: '' });
    }
  };

  const terminar = async () => {
    const ok = await confirmar({
      title: `¿Finalizar la consulta de ${paciente.nombre}?`,
      message: deEstaConsulta.length
        ? 'El paciente saldrá de tu agenda y la cita quedará como atendida.'
        : 'Aún no registraste ningún diagnóstico en esta consulta. El paciente saldrá de tu agenda.',
      confirmText: 'Finalizar consulta',
    });
    if (ok && finalizarConsulta(paciente)) {
      toast.success(`Consulta de ${paciente.nombre} finalizada.`);
      setPacienteId(null);
      setPestana('diagnostico');
    }
  };

  const limpiarOdontograma = async () => {
    const ok = await confirmar({
      title: '¿Limpiar todo el odontograma?',
      message: 'Se quitarán todas las marcas de este paciente.',
      confirmText: 'Limpiar',
      danger: true,
    });
    if (ok) guardarOdontograma(paciente.cedula, {});
  };

  if (!paciente) {
    return (
      <>
        <PageHeader title="Consulta" subtitle="Diagnóstico y tratamiento" />
        <Card>
          <EmptyState
            icon={faUserClock}
            title="No hay pacientes en tu agenda"
            text="Cuando enfermería registre los signos vitales de un paciente, aparecerá aquí."
          />
        </Card>
      </>
    );
  }

  const sv = paciente.signosVitales;

  return (
    <>
      <PageHeader title="Consulta" subtitle="Diagnóstico y tratamiento" />

      <div className={styles.layout}>
        <div className={styles.main}>
          <Card className={styles.patientCard}>
            <div className={styles.patientHead}>
              <div>
                <h2 className={styles.patientName}>{paciente.nombre}</h2>
                <p className={styles.patientMeta}>
                  C.I. {paciente.cedula} · {paciente.edad} años · {paciente.sexo} · {paciente.tratamiento}
                </p>
              </div>
              <div className={styles.patientActions}>
                <Button as={Link} to={`/pacientes/${paciente.cedula}`} variant="ghost" size="sm" icon={faFileMedical}>Ficha</Button>
                <Button variant="secondary" size="sm" icon={faPrescription} onClick={() => setReceta(true)}>Receta</Button>
                <Button size="sm" icon={faCircleCheck} onClick={terminar}>Finalizar consulta</Button>
              </div>
            </div>
            <dl className={styles.vitals}>
              <div><dt>Presión</dt><dd>{sv?.presion || '—'}</dd></div>
              <div><dt>Pulso</dt><dd>{sv?.pulso || '—'}</dd></div>
              <div><dt>Temperatura</dt><dd>{sv?.temperatura || '—'}</dd></div>
              <div>
                <dt>Alergias</dt>
                <dd>{paciente.alergias === 'Ninguna' ? 'Ninguna' : <Badge tone="danger">{paciente.alergias}</Badge>}</dd>
              </div>
            </dl>
          </Card>

          <Card padded={false}>
            <div className={styles.tabs}>
              <Tabs
                label="Secciones de la consulta"
                value={pestana}
                onChange={setPestana}
                items={[
                  { id: 'diagnostico', label: 'Diagnóstico', count: deEstaConsulta.length },
                  { id: 'odontograma', label: 'Odontograma' },
                  { id: 'historial', label: 'Historial', count: historial.length },
                ]}
              />
            </div>

            <div className={styles.tabBody}>
              {pestana === 'diagnostico' && (
                <>
                  <form className={styles.form} onSubmit={guardarDiagnostico} noValidate>
                    <Field as="textarea" label="Diagnóstico" placeholder="Describa el hallazgo clínico…" value={form.diagnostico} onChange={cambiar('diagnostico')} error={errores.diagnostico} />
                    <FieldRow>
                      <Field label="Pieza(s) dental(es)" placeholder="16, 26" value={form.diente} onChange={cambiar('diente')} error={errores.diente} />
                      <Field as="select" label="Procedimiento" value={procedimiento} onChange={cambiar('procedimiento')}>
                        {PROCEDIMIENTOS.map((p) => <option key={p}>{p}</option>)}
                      </Field>
                    </FieldRow>
                    <div className={styles.chips} aria-label="Procedimientos frecuentes">
                      {PROCEDIMIENTOS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`${styles.chip} ${procedimiento === p ? styles.chipActive : ''}`}
                          onClick={() => setForm((f) => ({ ...f, procedimiento: p }))}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <Field
                      as="textarea"
                      label="Notas clínicas"
                      placeholder="Observaciones adicionales…"
                      value={form.notas}
                      onChange={cambiar('notas')}
                      error={errores.notas}
                      hint={`${form.notas.length}/${MAX_NOTAS}`}
                    />
                    <div className={styles.formActions}>
                      <Button type="submit" icon={faFloppyDisk}>Guardar diagnóstico</Button>
                    </div>
                  </form>

                  {deEstaConsulta.length > 0 && (
                    <div className={styles.saved}>
                      <h3 className={styles.savedTitle}>Registrado en esta consulta</h3>
                      <ul>
                        {deEstaConsulta.map((h) => (
                          <li key={h.id}>
                            <strong>{h.procedimiento}</strong> · pieza {h.diente} — {h.diagnostico}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {pestana === 'odontograma' && (
                <Odontograma
                  key={paciente.cedula}
                  estados={odontograma}
                  onChange={(estados) => guardarOdontograma(paciente.cedula, estados)}
                  onLimpiarTodo={limpiarOdontograma}
                />
              )}

              {pestana === 'historial' && (
                <>
                  <Table
                    caption="Historial clínico"
                    columns={[
                      { key: 'fecha', header: 'Fecha', render: (h) => formatearFecha(h.fechaRegistro || h.fecha) },
                      { key: 'diente', header: 'Pieza', className: 'strong' },
                      { key: 'procedimiento', header: 'Procedimiento' },
                      { key: 'diagnostico', header: 'Diagnóstico' },
                      {
                        key: 'estado',
                        header: 'Estado',
                        render: (h) => {
                          const [tono, texto] = ESTADOS_HISTORIAL[h.estado] || ['neutral', h.estado];
                          return <Badge tone={tono}>{texto}</Badge>;
                        },
                      },
                    ]}
                    rows={historial}
                    empty={<EmptyState compact icon={faTooth} title="Sin registros previos" />}
                  />
                  <div className={styles.pdfBar}>
                    <Field type="date" label="Fecha (opcional)" value={fechaPdf} onChange={(e) => setFechaPdf(e.target.value)} />
                    <Button
                      variant="secondary"
                      icon={faFilePdf}
                      onClick={() => {
                        generarHistorialPDF(paciente, historial, fechaPdf || null);
                        toast.success('Historial descargado.');
                      }}
                    >
                      Descargar historial
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        <Card title="Agenda" subtitle={`${agenda.length} ${agenda.length === 1 ? 'paciente preparado' : 'pacientes preparados'}`} padded={false} className={styles.agenda}>
          <ul className={styles.agendaList}>
            {agenda.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`${styles.agendaItem} ${p.id === paciente.id ? styles.agendaActive : ''}`}
                  onClick={() => cambiarPaciente(p)}
                  aria-current={p.id === paciente.id ? 'true' : undefined}
                >
                  <span className={styles.agendaTime}>{p.hora}</span>
                  <span className={styles.agendaText}>
                    <strong>{p.nombre}</strong>
                    <span>{p.tratamiento}</span>
                  </span>
                  {p.alergias !== 'Ninguna' && <Badge tone="danger">Alergia</Badge>}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {receta && (
        <RecetaModal
          open
          paciente={paciente}
          onClose={() => setReceta(false)}
          onGenerar={(datosReceta) => {
            generarRecetaPDF(paciente, datosReceta);
            toast.success('Receta descargada.');
            setReceta(false);
          }}
        />
      )}
    </>
  );
}

export default ConsultaPage;
