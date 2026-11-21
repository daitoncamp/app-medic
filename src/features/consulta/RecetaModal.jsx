import { useState } from 'react';
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { Button, Field, FieldRow, Modal } from '../../components/ui';
import { requerido, validarFormulario } from '../../utils/validaciones';

const VACIO = { medicamento: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' };

const sinNegativos = (v) => (String(v).includes('-') ? 'Ingrese un valor correcto.' : '');

const REGLAS = {
  medicamento: [requerido, (v) => (/\d/.test(v) ? 'Escriba solo el nombre (la dosis va aparte).' : '')],
  dosis: [requerido, sinNegativos],
  frecuencia: [requerido, sinNegativos],
  duracion: [requerido, sinNegativos],
};

function RecetaModal({ open, paciente, onClose, onGenerar }) {
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});

  const cambiar = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
  };

  const enviar = (e) => {
    e.preventDefault();
    const nuevos = validarFormulario(form, REGLAS);
    setErrores(nuevos);
    if (!Object.keys(nuevos).length) onGenerar(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Receta médica"
      description={paciente?.nombre}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-receta" icon={faFilePdf}>Generar PDF</Button>
        </>
      )}
    >
      <form id="form-receta" onSubmit={enviar} noValidate style={{ display: 'grid', gap: 16 }}>
        <Field label="Medicamento" placeholder="Ibuprofeno" value={form.medicamento} onChange={cambiar('medicamento')} error={errores.medicamento} />
        <FieldRow columns={3}>
          <Field label="Dosis" placeholder="400 mg" value={form.dosis} onChange={cambiar('dosis')} error={errores.dosis} />
          <Field label="Frecuencia" placeholder="Cada 8 horas" value={form.frecuencia} onChange={cambiar('frecuencia')} error={errores.frecuencia} />
          <Field label="Duración" placeholder="3 días" value={form.duracion} onChange={cambiar('duracion')} error={errores.duracion} />
        </FieldRow>
        <Field as="textarea" label="Indicaciones" placeholder="Tomar después de las comidas…" value={form.indicaciones} onChange={cambiar('indicaciones')} />
      </form>
    </Modal>
  );
}

export default RecetaModal;
