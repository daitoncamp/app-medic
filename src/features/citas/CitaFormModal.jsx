import { useState } from 'react';
import { Button, Field, FieldRow, Modal } from '../../components/ui';
import { ESTADOS_CITA, fechaLocalISO } from '../../services/clinica';
import { buscarPacientePorCedula, erroresDeFormulario } from '../../services/recepcionApi';
import { agruparPorGrupo, TIPOS_CITA } from '../../utils/procedimientos';
import { requerido, reglasPaciente, validarFormulario } from '../../utils/validaciones';
import CamposPaciente from './CamposPaciente';
import { PACIENTE_VACIO, pacienteAFormulario } from './paciente';
import styles from './Citas.module.css';

// Tipos de cita agrupados (General, Prevención, Restauración…), del catálogo compartido
const GRUPOS_CITA = agruparPorGrupo(TIPOS_CITA);

const reglasCita = (editando) => ({
  ...reglasPaciente,
  fecha: [requerido, (v) => (editando || !v || v >= fechaLocalISO() ? '' : 'La fecha no puede ser anterior a hoy.')],
  hora: [requerido],
  consulta: [(v) => requerido(v, 'Seleccione el tipo de consulta.')],
});

/**
 * Agendar o editar una cita. Si la cédula ya existe, completa los datos del paciente.
 * onGuardar(form) devuelve una promesa; si la API rechaza los datos, los errores se
 * muestran en cada campo.
 */
function CitaFormModal({ open, cita, onClose, onGuardar }) {
  const editando = Boolean(cita);
  const [form, setForm] = useState(() => (cita
    ? { ...PACIENTE_VACIO, ...pacienteAFormulario(cita.datosPaciente || {}), fecha: cita.fecha, hora: cita.hora, consulta: cita.consulta, estado: cita.estado }
    : { ...PACIENTE_VACIO, fecha: fechaLocalISO(), hora: '', consulta: '', estado: ESTADOS_CITA.PENDIENTE }));
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (e) => {
    const valor = e.target.type === 'checkbox'
      ? (e.target.checked ? ESTADOS_CITA.CONFIRMADA : ESTADOS_CITA.PENDIENTE)
      : e.target.value;
    setForm((f) => ({ ...f, [campo]: valor }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
    if (campo === 'cedula') setAviso('');
  };

  // Al completar la cédula se buscan los datos del paciente en el servidor
  const alCompletarCedula = async (cedula) => {
    if (editando) return;
    try {
      const existente = await buscarPacientePorCedula(cedula);
      if (existente) {
        setForm((f) => ({ ...f, ...pacienteAFormulario(existente) }));
        setErrores({});
        setAviso(`Paciente encontrado: ${existente.nombre}. Datos completados.`);
      }
    } catch {
      // Si falla la búsqueda se llenan los datos a mano
    }
  };

  const enviar = async (e) => {
    e.preventDefault();
    const nuevos = validarFormulario(form, reglasCita(editando));
    setErrores(nuevos);
    setErrorGeneral('');
    if (Object.keys(nuevos).length) return;
    setGuardando(true);
    try {
      await onGuardar(form);
    } catch (error) {
      const porCampo = erroresDeFormulario(error);
      if (Object.keys(porCampo).length) setErrores(porCampo);
      else if (error.status === 409) setErrores({ hora: error.message });
      else setErrorGeneral(error.message);
      setGuardando(false);
    }
  };

  const puedeConfirmar = !editando || cita.estado === ESTADOS_CITA.PENDIENTE;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar cita' : 'Nueva cita'}
      description={editando ? cita.paciente : 'Si el paciente ya existe, escribe su cédula y se completan sus datos.'}
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-cita" disabled={guardando}>
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Agendar cita'}
          </Button>
        </>
      )}
    >
      <form id="form-cita" className={styles.form} onSubmit={enviar} noValidate>
        {errorGeneral && <p className={styles.formError} role="alert">{errorGeneral}</p>}

        <fieldset className={styles.fieldset}>
          <legend>Paciente</legend>
          <CamposPaciente form={form} errores={errores} cambiar={cambiar} onCedula={alCompletarCedula} avisoCedula={aviso} />
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Cita</legend>
          <FieldRow columns={3}>
            <Field label="Fecha" type="date" min={editando ? undefined : fechaLocalISO()} value={form.fecha} onChange={cambiar('fecha')} error={errores.fecha} />
            <Field label="Hora" type="time" step="900" value={form.hora} onChange={cambiar('hora')} error={errores.hora} />
            <Field as="select" label="Tipo de consulta" value={form.consulta} onChange={cambiar('consulta')} error={errores.consulta}>
              <option value="">Seleccione…</option>
              {GRUPOS_CITA.map((g) => (
                <optgroup key={g.grupo} label={g.grupo}>
                  {g.items.map((t) => <option key={t.nombre}>{t.nombre}</option>)}
                </optgroup>
              ))}
            </Field>
          </FieldRow>

          {puedeConfirmar && !editando && (
            <label className={styles.check}>
              <input type="checkbox" checked={form.estado === ESTADOS_CITA.CONFIRMADA} onChange={cambiar('estado')} />
              <span>
                <strong>El paciente ya llegó: enviar a enfermería</strong>
                <span className={styles.checkHint}>Déjalo sin marcar para una cita futura; la confirmas cuando el paciente llegue.</span>
              </span>
            </label>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}

export default CitaFormModal;
