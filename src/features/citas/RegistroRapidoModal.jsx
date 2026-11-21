import { useState } from 'react';
import { Button, Field, FieldRow, Modal } from '../../components/ui';
import { reglasPaciente, validarFormulario } from '../../utils/validaciones';
import styles from './Citas.module.css';

const VACIO = { cedula: '', nombre: '', sexo: '', edad: '', telefono: '', correo: '' };

/** Paciente que llega sin cita: se registra y pasa directo a enfermería */
function RegistroRapidoModal({ open, onClose, onGuardar }) {
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});

  const cambiar = (campo) => (e) => {
    const valor = campo === 'cedula' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value;
    setForm((f) => ({ ...f, [campo]: valor }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
  };

  const enviar = (e) => {
    e.preventDefault();
    const nuevos = validarFormulario(form, reglasPaciente);
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    onGuardar({ ...form, nombre: form.nombre.trim(), correo: form.correo.trim() });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registro rápido"
      description="Para pacientes que llegan sin cita. Se crea una revisión para ahora y pasa a enfermería."
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-registro">Registrar y enviar</Button>
        </>
      )}
    >
      <form id="form-registro" className={styles.form} onSubmit={enviar} noValidate>
        <FieldRow>
          <Field label="Cédula" inputMode="numeric" placeholder="10 dígitos" value={form.cedula} onChange={cambiar('cedula')} error={errores.cedula} />
          <Field label="Nombre completo" value={form.nombre} onChange={cambiar('nombre')} error={errores.nombre} />
        </FieldRow>
        <FieldRow>
          <Field as="select" label="Sexo" value={form.sexo} onChange={cambiar('sexo')} error={errores.sexo}>
            <option value="">Seleccione…</option>
            <option>Femenino</option>
            <option>Masculino</option>
            <option>Otro</option>
          </Field>
          <Field label="Edad" type="number" min="0" max="120" value={form.edad} onChange={cambiar('edad')} error={errores.edad} />
        </FieldRow>
        <FieldRow>
          <Field label="Teléfono" inputMode="tel" placeholder="09xxxxxxxx" value={form.telefono} onChange={cambiar('telefono')} error={errores.telefono} />
          <Field label="Correo" type="email" value={form.correo} onChange={cambiar('correo')} error={errores.correo} />
        </FieldRow>
      </form>
    </Modal>
  );
}

export default RegistroRapidoModal;
