import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  faCircleCheck, faCircleExclamation, faFileMedical, faFilePdf, faFileSignature, faFloppyDisk, faPrescription, faTooth,
  faUserClock,
} from '@fortawesome/free-solid-svg-icons';
import {
  AlertList, Badge, Button, Card, EmptyState, Field, FieldRow, PageHeader, Table, Tabs, useConfirm, useToast,
} from '../../components/ui';
import { useRecurso } from '../../hooks/useRecurso';
import { sesionActual } from '../../services/authService';
import {
  deshacerMarcasDeHoy, emitirReceta, ESTADOS_PROCEDIMIENTO, finalizarConsulta, marcarPieza,
  obtenerAgenda, obtenerConsulta, registrarConsentimiento, registrarDiagnostico,
} from '../../services/consultaApi';
import { requiereConsentimiento } from '../../utils/consentimientos';
import { combinarOdontograma } from '../../utils/odontograma';
import {
  agruparPorGrupo, normalizarProcedimiento, procedimientoParaCita, PROCEDIMIENTOS,
} from '../../utils/procedimientos';
import { TEXTO_ANTECEDENTE } from '../../services/recepcionApi';
import { formatearFecha } from '../../utils/formato';
import { requerido, validarFormulario } from '../../utils/validaciones';
import ConsentimientoModal from './ConsentimientoModal';
import Odontograma from './Odontograma';
import RecetaModal from './RecetaModal';
import { generarConsentimientoPDF, generarHistorialPDF, generarRecetaPDF } from './pdf';
import styles from './Consulta.module.css';
import { comoErrorApi } from '../../services/api';
import type { Tono } from '../../components/ui/Badge';
import type { NuevoDiagnostico, OdontogramaConsulta } from '../../services/consultaApi';
import type { Cara, ConsentimientoApi } from '../../types/api';
import type { Errores, EstadoPieza, MarcaPieza, Odontograma as Mapa } from '../../types/dominio';
import type { Validador } from '../../utils/validaciones';

const ESTADOS_HISTORIAL: Record<string, [Tono, string]> = {
  completado: ['success', 'Completado'], proceso: ['info', 'En proceso'], pendiente: ['warning', 'Pendiente'],
};
const MAX_NOTAS = 300;

type FormDiagnostico = Required<NuevoDiagnostico>;

const REGLAS: Partial<Record<keyof FormDiagnostico, Validador[]>> = {
  diagnostico: [
    requerido,
    (v) => (/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s,.;:()/%°+-]+$/.test(String(v)) ? '' : 'Contiene caracteres no permitidos.'),
  ],
  diente: [requerido, (v) => (/^\d{2}(\s*,\s*\d{2})*$/.test(String(v).trim()) ? '' : 'Use números de 2 dígitos separados por comas (ej.: 11, 26).')],
  notas: [(v) => (String(v).length > MAX_NOTAS ? `Máximo ${MAX_NOTAS} caracteres.` : '')],
};

const GRUPOS_PROCEDIMIENTO = agruparPorGrupo(PROCEDIMIENTOS);

// El tipo de cita de recepción sugiere el procedimiento (urgencias y controles → Revisión)
const procedimientoSugerido = (tipoConsulta = '') => procedimientoParaCita(tipoConsulta);

const formularioVacio = (tipoConsulta?: string): FormDiagnostico => ({
  diagnostico: '', diente: '', procedimiento: procedimientoSugerido(tipoConsulta), notas: '', estado: 'COMPLETADO',
});

function ConsultaPage() {
  const toast = useToast();
  const confirmar = useConfirm();
  const location = useLocation();
  const sesion = sesionActual();

  // Agenda: pacientes que enfermería ya preparó (se actualiza sola)
  const agendaRecurso = useRecurso(obtenerAgenda, [], { intervalo: 20000 });
  const agenda = agendaRecurso.datos?.agenda || [];

  const [elegidoId, setElegidoId] = useState<string | null>((location.state as { citaId?: string } | null)?.citaId || null);
  const citaId = agenda.some((p) => p.id === elegidoId) ? elegidoId : agenda[0]?.id || null;

  // Detalle de la consulta elegida
  const detalleRecurso = useRecurso(() => (citaId ? obtenerConsulta(citaId) : Promise.resolve(null)), [citaId]);
  const detalle = detalleRecurso.datos?.citaId === citaId ? detalleRecurso.datos : null;

  const [pestana, setPestana] = useState<'diagnostico' | 'odontograma' | 'historial'>('diagnostico');
  const [form, setForm] = useState<FormDiagnostico>(() => formularioVacio());
  const [formDe, setFormDe] = useState<string | null>(null); // cita a la que pertenece el formulario
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [receta, setReceta] = useState(false);
  const [consentimiento, setConsentimiento] = useState<{ procedimiento: string } | null>(null);
  const [fechaPdf, setFechaPdf] = useState('');
  // Cambios del odontograma que aún no confirma el servidor (se ven al instante)
  const [odontoLocal, setOdontoLocal] = useState<{ citaId: string; valor: OdontogramaConsulta } | null>(null);

  // Al cambiar de paciente, el formulario arranca con el procedimiento sugerido
  if (detalle && formDe !== detalle.citaId) {
    setFormDe(detalle.citaId);
    setForm(formularioVacio(detalle.paciente.tratamiento));
    setErrores({});
  }

  const elegir = (id: string) => {
    setElegidoId(id);
    setPestana('diagnostico');
  };

  const cambiar = (campo: keyof FormDiagnostico) => (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
  };

  const guardarDiagnostico = async (e: FormEvent) => {
    e.preventDefault();
    const nuevos = validarFormulario(form, REGLAS as Record<string, Validador[]>);
    setErrores(nuevos);
    if (Object.keys(nuevos).length || guardando || !citaId) return;
    setGuardando(true);
    try {
      await registrarDiagnostico(citaId, form);
      toast.success('Diagnóstico guardado.');
      setForm((f) => ({ ...formularioVacio(), procedimiento: f.procedimiento }));
      detalleRecurso.recargar();
      agendaRecurso.recargar();
    } catch (err) {
      const error = comoErrorApi(err);
      if (error.detalles) setErrores(error.detalles);
      else toast.error(error.message);
    } finally {
      setGuardando(false);
    }
  };

  // ===== Odontograma =====
  const odontograma = odontoLocal?.citaId === citaId ? odontoLocal.valor : detalle?.odontograma;

  const cambiarOdontograma = async (optimista: OdontogramaConsulta, peticion: () => Promise<OdontogramaConsulta>) => {
    const antes = odontograma;
    if (!citaId || !antes) return;
    setOdontoLocal({ citaId, valor: optimista });
    try {
      const valor = await peticion();
      setOdontoLocal({ citaId, valor });
    } catch (err) {
      const error = comoErrorApi(err);
      setOdontoLocal({ citaId, valor: antes });
      toast.error(error.message || 'No se pudo guardar el odontograma.');
    }
  };

  // En una visita, la pieza se marca completa o por caras (igual que en el servidor)
  const marcar = (pieza: number, estado: EstadoPieza, cara: Cara | 'COMPLETA' = 'COMPLETA') => {
    if (!odontograma || !citaId) return;
    const hoy = odontograma.actual[pieza];
    const nueva: MarcaPieza = cara === 'COMPLETA'
      ? { completa: estado, caras: {} }
      : { completa: null, caras: { ...(hoy?.completa ? {} : hoy?.caras), [cara]: estado } };
    return cambiarOdontograma(
      { ...odontograma, actual: { ...odontograma.actual, [pieza]: nueva } },
      () => marcarPieza(citaId, pieza, estado, cara),
    );
  };

  const quitar = (pieza: number) => {
    if (!odontograma || !citaId) return;
    const actual: Mapa = { ...odontograma.actual };
    delete actual[pieza];
    return cambiarOdontograma({ ...odontograma, actual }, () => marcarPieza(citaId, pieza, null));
  };

  const deshacerTodo = async () => {
    const ok = await confirmar({
      title: '¿Deshacer las marcas de hoy?',
      message: 'Se quitan las marcas hechas en esta consulta. Las de visitas anteriores se conservan.',
      confirmText: 'Deshacer',
      danger: true,
    });
    if (ok && odontograma && citaId) cambiarOdontograma({ ...odontograma, actual: {} }, () => deshacerMarcasDeHoy(citaId));
  };

  // ===== Finalizar =====
  const terminar = async () => {
    if (!detalle || !citaId) return;
    const { paciente, deEstaConsulta } = detalle;
    const ok = await confirmar({
      title: `¿Finalizar la consulta de ${paciente.nombre}?`,
      message: deEstaConsulta.length
        ? 'El paciente saldrá de tu agenda y la cita quedará como atendida.'
        : 'Aún no registraste ningún diagnóstico en esta consulta. El paciente saldrá de tu agenda.',
      confirmText: 'Finalizar consulta',
    });
    if (!ok) return;
    try {
      await finalizarConsulta(citaId);
      toast.success(`Consulta de ${paciente.nombre} finalizada. Sus documentos siguen disponibles en la ficha del paciente.`, 6000);
      setElegidoId(null);
      setPestana('diagnostico');
      agendaRecurso.recargar();
    } catch (err) {
      const error = comoErrorApi(err);
      toast.error(error.message);
      agendaRecurso.recargar();
    }
  };

  // ===== Pantallas de espera =====
  if (agendaRecurso.cargando && !agendaRecurso.datos) {
    return (
      <>
        <PageHeader title="Consulta" subtitle="Diagnóstico y tratamiento" />
        <Card><EmptyState compact title="Cargando agenda…" /></Card>
      </>
    );
  }

  if (agendaRecurso.error && !agendaRecurso.datos) {
    return (
      <>
        <PageHeader title="Consulta" subtitle="Diagnóstico y tratamiento" />
        <Card>
          <EmptyState
            icon={faCircleExclamation}
            title="No se pudo cargar la agenda"
            text={agendaRecurso.error.message}
            action={<Button variant="secondary" onClick={agendaRecurso.recargar}>Reintentar</Button>}
          />
        </Card>
      </>
    );
  }

  if (!agenda.length) {
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

  const panelAgenda = (
    <Card title="Agenda" subtitle={`${agenda.length} ${agenda.length === 1 ? 'paciente preparado' : 'pacientes preparados'}`} padded={false} className={styles.agenda}>
      <ul className={styles.agendaList}>
        {agenda.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className={`${styles.agendaItem} ${p.id === citaId ? styles.agendaActive : ''}`}
              onClick={() => elegir(p.id)}
              aria-current={p.id === citaId ? 'true' : undefined}
            >
              <span className={styles.agendaTime}>
                {p.hora}
                {p.deOtroDia && <small className={styles.agendaDate}>{formatearFecha(p.fecha)}</small>}
              </span>
              <span className={styles.agendaText}>
                <strong>{p.nombre}</strong>
                <span>{p.tratamiento}</span>
              </span>
              {p.deOtroDia ? (
                <Badge tone="warning">Sin finalizar</Badge>
              ) : p.alertas.length > 0 && (
                <Badge tone="danger">{p.alertas.length} {p.alertas.length === 1 ? 'alerta' : 'alertas'}</Badge>
              )}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );

  if (!detalle) {
    return (
      <>
        <PageHeader title="Consulta" subtitle="Diagnóstico y tratamiento" />
        <div className={styles.layout}>
          <div className={styles.main}>
            <Card>
              {detalleRecurso.error ? (
                <EmptyState
                  icon={faCircleExclamation}
                  title="No se pudo abrir la consulta"
                  text={detalleRecurso.error.message}
                  action={<Button variant="secondary" onClick={detalleRecurso.recargar}>Reintentar</Button>}
                />
              ) : (
                <EmptyState compact title="Abriendo consulta…" />
              )}
            </Card>
          </div>
          {panelAgenda}
        </div>
      </>
    );
  }

  const {
    paciente, historial, deEstaConsulta, antecedentes, recetas, consentimientos,
  } = detalle;
  // Con el detalle cargado, la cita elegida es la de este detalle
  const idCita = detalle.citaId;
  const odonto = odontograma ?? detalle.odontograma;
  const procedimientosFirmados = consentimientos.map((c) => normalizarProcedimiento(c.procedimiento));
  const necesitaConsentimiento = requiereConsentimiento(form.procedimiento) && form.estado !== 'PENDIENTE';
  const tieneConsentimiento = procedimientosFirmados.includes(form.procedimiento);

  const descargarConsentimiento = async (c: ConsentimientoApi) => {
    try {
      await generarConsentimientoPDF(paciente, c);
    } catch {
      toast.error('No se pudo generar el PDF del consentimiento.');
    }
  };
  const sv = paciente.signosVitales;
  const otrosAntecedentes = antecedentes.filter((a) => a.tipo !== 'ALERGIA');
  const odontogramaVisible = combinarOdontograma(odonto.anterior, odonto.actual);

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
                <Button variant="secondary" size="sm" icon={faFileSignature} onClick={() => setConsentimiento({ procedimiento: form.procedimiento })}>
                  Consentimiento{consentimientos.length ? ` (${consentimientos.length})` : ''}
                </Button>
                <Button variant="secondary" size="sm" icon={faPrescription} onClick={() => setReceta(true)}>
                  Receta{recetas.length ? ` (${recetas.length})` : ''}
                </Button>
                <Button size="sm" icon={faCircleCheck} onClick={terminar}>Finalizar consulta</Button>
              </div>
            </div>
            <dl className={styles.vitals}>
              <div><dt>Presión</dt><dd>{sv?.presion || '—'}</dd></div>
              <div><dt>Pulso</dt><dd>{sv?.pulso || '—'}</dd></div>
              <div><dt>Temperatura</dt><dd>{sv?.temperatura || '—'}</dd></div>
              {sv?.frecuenciaRespiratoria && <div><dt>Frec. respiratoria</dt><dd>{sv.frecuenciaRespiratoria}</dd></div>}
              {sv?.saturacion && <div><dt>Saturación O₂</dt><dd>{sv.saturacion}</dd></div>}
              <div>
                <dt>Alergias</dt>
                <dd>{paciente.alergias === 'Ninguna' ? 'Ninguna' : <Badge tone="danger" className={styles.allergyBadge}>{paciente.alergias}</Badge>}</dd>
              </div>
            </dl>
            {otrosAntecedentes.length > 0 && (
              <ul className={styles.background} aria-label="Antecedentes médicos">
                {otrosAntecedentes.map((a) => (
                  <li key={a.id}><strong>{TEXTO_ANTECEDENTE[a.tipo] || a.tipo}:</strong> {a.descripcion}</li>
                ))}
              </ul>
            )}
            {paciente.alertas.length > 0 && (
              <div className={styles.alerts}>
                <p className={styles.alertsTitle}>Alertas médicas</p>
                <AlertList compact alertas={paciente.alertas} />
              </div>
            )}
          </Card>

          <Card padded={false}>
            <div className={styles.tabs}>
              <Tabs
                label="Secciones de la consulta"
                value={pestana}
                onChange={setPestana}
                items={[
                  { id: 'diagnostico', label: 'Diagnóstico', count: deEstaConsulta.length },
                  { id: 'odontograma', label: 'Odontograma', count: Object.keys(odonto.actual).length || undefined },
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
                      <Field label="Pieza(s) dental(es)" placeholder="16, 26" value={form.diente} onChange={cambiar('diente')} error={errores.diente} hint="Numeración FDI: 11-48 permanentes, 51-85 temporales." />
                      <Field as="select" label="Procedimiento" value={form.procedimiento} onChange={cambiar('procedimiento')} error={errores.procedimiento} hint="* Requiere consentimiento informado.">
                        {GRUPOS_PROCEDIMIENTO.map((g) => (
                          <optgroup key={g.grupo} label={g.grupo}>
                            {g.items.map((p) => (
                              <option key={p.nombre} value={p.nombre}>
                                {p.nombre}{p.consentimiento ? ' *' : ''}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </Field>
                    </FieldRow>
                    {necesitaConsentimiento && (tieneConsentimiento ? (
                      <p className={styles.consentOk}>✓ Consentimiento informado de {form.procedimiento.toLowerCase()} registrado.</p>
                    ) : (
                      <div className={styles.consentWarning} role="status">
                        <span>{form.procedimiento} requiere consentimiento informado antes de realizarse.</span>
                        <Button size="sm" variant="secondary" icon={faFileSignature} onClick={() => setConsentimiento({ procedimiento: form.procedimiento })}>
                          Registrar consentimiento
                        </Button>
                      </div>
                    ))}
                    <Field as="select" label="Estado del procedimiento" value={form.estado} onChange={cambiar('estado')} error={errores.estado}>
                      {ESTADOS_PROCEDIMIENTO.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                    </Field>
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
                      <Button type="submit" icon={faFloppyDisk} disabled={guardando}>
                        {guardando ? 'Guardando…' : 'Guardar diagnóstico'}
                      </Button>
                    </div>
                  </form>

                  {(deEstaConsulta.length > 0 || consentimientos.length > 0) && (
                    <div className={styles.saved}>
                      <h3 className={styles.savedTitle}>Registrado en esta consulta</h3>
                      <ul>
                        {consentimientos.map((c) => (
                          <li key={c.id}>
                            <strong>Consentimiento</strong> · {c.procedimiento} — firmó {c.esRepresentante ? `${c.firmanteNombre} (representante)` : 'el paciente'}{' '}
                            <Button size="sm" variant="ghost" icon={faFilePdf} onClick={() => descargarConsentimiento(c)}>PDF</Button>
                          </li>
                        ))}
                        {deEstaConsulta.map((h) => {
                          const [tono, texto] = ESTADOS_HISTORIAL[h.estado] || ['neutral', h.estado];
                          return (
                            <li key={h.id}>
                              <strong>{h.procedimiento}</strong> · pieza {h.diente} — {h.diagnostico}{' '}
                              <Badge tone={tono}>{texto}</Badge>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {pestana === 'odontograma' && (
                <Odontograma
                  key={citaId}
                  estados={odontogramaVisible}
                  marcadosHoy={odonto.actual}
                  onMarcar={marcar}
                  onQuitar={quitar}
                  onDeshacerTodo={deshacerTodo}
                  denticionInicial={Number(paciente.edad) < 6 ? 'nino' : 'adulto'}
                />
              )}

              {pestana === 'historial' && (
                <>
                  <Table
                    caption="Historial clínico"
                    columns={[
                      { key: 'fecha', header: 'Fecha', render: (h) => formatearFecha(h.fechaRegistro) },
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
                      onClick={async () => {
                        try {
                          await generarHistorialPDF(paciente, historial, {
                            fecha: fechaPdf || null, odontograma: odontogramaVisible, firmante: sesion?.nombre,
                          });
                          toast.success('Historial descargado.');
                        } catch {
                          toast.error('No se pudo generar el historial.');
                        }
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

        {panelAgenda}
      </div>

      {consentimiento && (
        <ConsentimientoModal
          paciente={paciente}
          procedimientoInicial={consentimiento.procedimiento}
          yaFirmados={procedimientosFirmados}
          onClose={() => setConsentimiento(null)}
          onRegistrar={async (datos) => {
            const guardado = await registrarConsentimiento(idCita, datos);
            setConsentimiento(null);
            detalleRecurso.recargar();
            toast.success(`Consentimiento de ${guardado.procedimiento.toLowerCase()} registrado. Imprime el PDF para las firmas.`, 6000);
            await descargarConsentimiento(guardado);
          }}
        />
      )}

      {receta && (
        <RecetaModal
          open
          paciente={paciente}
          onClose={() => setReceta(false)}
          onGenerar={async (datosReceta) => {
            let guardada;
            try {
              guardada = await emitirReceta(idCita, datosReceta);
            } catch (err) {
              const error = comoErrorApi(err);
              // Los errores por campo vuelven al formulario; los demás se avisan aquí
              if (!error.detalles) toast.error(error.message);
              throw error;
            }
            setReceta(false);
            detalleRecurso.recargar();
            try {
              await generarRecetaPDF(paciente, guardada);
              toast.success(`Receta ${guardada.numero} emitida y descargada.`);
            } catch {
              toast.error('La receta quedó guardada, pero no se pudo generar el PDF. Descárgala desde la ficha del paciente.');
            }
          }}
        />
      )}
    </>
  );
}

export default ConsultaPage;
