import { useState } from 'react';
import { Button, Field, FieldRow, Modal } from '../../components/ui';
import { ESTADOS_CITA, fechaLocalISO, obtenerListaPacientes } from '../../services/clinica';
import {
  requerido, reglasPaciente, validarFormulario,
} from '../../utils/validaciones';
import styles from './Citas.module.css';

const TIPOS_CONSULTA = ['Revisión', 'Limpieza dental', 'Extracción', 'Endodoncia', 'Ortodoncia', 'Resina', 'Corona'];

const VACIO = {
  cedula: '', paciente: '', fecha: '', hora: '', consulta: '',
  sexo: '', edad: '', telefono: '', email: '', estado: ESTADOS_CITA.PENDIENTE,
};

// Mismas reglas del paciente, con los nombres de campo de la cita
const REGLAS_CITA = {
  cedula: reglasPaciente.cedula,
  paciente: reglasPaciente.nombre,
  sexo: reglasPaciente.sexo,
  edad: reglasPaciente.edad,
  telefono: reglasPaciente.telefono,
  email: reglasPaciente.correo,
  fecha: [requerido, (v) => (!v || v >= fechaLocalISO() ? '' : 'La fecha no puede ser anterior a hoy.')],
  hora: [requerido],
  consulta: [(v) => requerido(v, 'Seleccione el tipo de consulta.')],
};

/**
 * Formulario para agendar o editar una cita.
 * Si la cédula ya existe, completa los datos del paciente.
 */
function CitaFormModal({ open, cita, onClose, onGuardar }) {
  const editando = Boolean(cita);
  const [form, setForm] = useState(() => (cita ? { ...VACIO, ...cita } : { ...VACIO, fecha: fechaLocalISO() }));
  const [errores, setErrores] = useState({});
  const [autocompletado, setAutocompletado] = useState(false);

  const cambiar = (campo) => (e) => {
    const valor = e.target.type === 'checkbox'
      ? (e.target.checked ? ESTADOS_CITA.CONFIRMADA : ESTADOS_CITA.PENDIENTE)
      : e.target.value;
    setForm((f) => ({ ...f, [campo]: valor }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
  };

  // Al completar los 10 dígitos de la cédula, busca al paciente
  const cambiarCedula = (e) => {
    const cedula = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((f) => ({ ...f, cedula }));
    setAutocompletado(false);
    if (cedula.length === 10 && !editando) {
      const existente = obtenerListaPacientes().find((p) => p.cedula === cedula);
      if (existente) {
        setForm((f) => ({
          ...f,
          paciente: existente.nombre || '',
          sexo: existente.sexo || '',
          edad: String(existente.edad || ''),
          telefono: existente.telefono || '',
          email: existente.correo || '',
        }));
        setErrores({});
        setAutocompletado(true);
      }
    }
  };

  const enviar = (e) => {
    e.preventDefault();
    const reglas = editando
      ? { ...REGLAS_CITA, fecha: [requerido] } // al editar se permiten fechas pasadas
      : REGLAS_CITA;
    const nuevos = validarFormulario(form, reglas);
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    onGuardar({ ...form, paciente: form.paciente.trim(), email: form.email.trim() });
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
          <Button type="submit" form="form-cita">{editando ? 'Guardar cambios' : 'Agendar cita'}</Button>
        </>
      )}
    >
      <form id="form-cita" className={styles.form} onSubmit={enviar} noValidate>
        <fieldset className={styles.fieldset}>
          <legend>Paciente</legend>
          <FieldRow>
            <Field
              label="Cédula"
              inputMode="numeric"
              placeholder="10 dígitos"
              value={form.cedula}
              onChange={cambiarCedula}
              error={errores.cedula}
              hint={autocompletado ? 'Paciente encontrado: datos completados.' : undefined}
            />
            <Field label="Nombre completo" value={form.paciente} onChange={cambiar('paciente')} error={errores.paciente} />
          </FieldRow>
          <FieldRow columns={3}>
            <Field as="select" label="Sexo" value={form.sexo} onChange={cambiar('sexo')} error={errores.sexo}>
              <option value="">Seleccione…</option>
              <option>Femenino</option>
              <option>Masculino</option>
              <option>Otro</option>
            </Field>
            <Field label="Edad" type="number" min="0" max="120" value={form.edad} onChange={cambiar('edad')} error={errores.edad} />
            <Field label="Teléfono" inputMode="tel" placeholder="09xxxxxxxx" value={form.telefono} onChange={cambiar('telefono')} error={errores.telefono} />
          </FieldRow>
          <Field label="Correo" type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={cambiar('email')} error={errores.email} />
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Cita</legend>
          <FieldRow columns={3}>
            <Field label="Fecha" type="date" value={form.fecha} onChange={cambiar('fecha')} error={errores.fecha} />
            <Field label="Hora" type="time" value={form.hora} onChange={cambiar('hora')} error={errores.hora} />
            <Field as="select" label="Tipo de consulta" value={form.consulta} onChange={cambiar('consulta')} error={errores.consulta}>
              <option value="">Seleccione…</option>
              {TIPOS_CONSULTA.map((t) => <option key={t}>{t}</option>)}
            </Field>
          </FieldRow>

          {puedeConfirmar && (
            <label className={styles.check}>
              <input type="checkbox" checked={form.estado === ESTADOS_CITA.CONFIRMADA} onChange={cambiar('estado')} />
              <span>
                <strong>Confirmar ahora y enviar a enfermería</strong>
                <span className={styles.checkHint}>Déjalo sin marcar si el paciente aún no confirma su asistencia.</span>
              </span>
            </label>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}

export default CitaFormModal;
