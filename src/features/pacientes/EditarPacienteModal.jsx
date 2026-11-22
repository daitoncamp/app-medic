import { useState } from 'react';
import { Button, Modal } from '../../components/ui';
import { actualizarPaciente, erroresDeFormulario } from '../../services/recepcionApi';
import { reglasPaciente, validarFormulario } from '../../utils/validaciones';
import CamposPaciente from '../citas/CamposPaciente';
import { pacienteAFormulario } from '../citas/paciente';
import styles from '../citas/Citas.module.css';

/**
 * Editar los datos personales del paciente desde su ficha.
 * onGuardado(paciente) recibe el paciente actualizado (la cédula puede haber cambiado).
 */
function EditarPacienteModal({ paciente, onClose, onGuardado }) {
  const [form, setForm] = useState(() => pacienteAFormulario(paciente));
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');

  const cambiar = (campo) => (e) => {
    const valor = e.target.value;
    setForm((f) => ({ ...f, [campo]: valor }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    const nuevos = validarFormulario(form, reglasPaciente);
    setErrores(nuevos);
    setErrorGeneral('');
    if (Object.keys(nuevos).length || guardando) return;
    setGuardando(true);
    try {
      const actualizado = await actualizarPaciente(paciente.cedula, form);
      onGuardado(actualizado);
    } catch (error) {
      const porCampo = erroresDeFormulario(error);
      if (Object.keys(porCampo).length) setErrores(porCampo);
      else if (error.status === 409) setErrores({ cedula: error.message });
      else setErrorGeneral(error.message);
      setGuardando(false);
    }
  };

  const cambiaCedula = form.cedula !== paciente.cedula;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Editar datos del paciente"
      description={paciente.nombre}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button type="submit" form="form-editar-paciente" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </>
      )}
    >
      <form id="form-editar-paciente" onSubmit={enviar} noValidate className={styles.form}>
        <CamposPaciente
          form={form}
          errores={errores}
          cambiar={cambiar}
          avisoCedula={cambiaCedula ? 'Solo cámbiala si estaba mal escrita: la historia del paciente se conserva.' : undefined}
        />
        {errorGeneral && <p className={styles.formError} role="alert">{errorGeneral}</p>}
      </form>
    </Modal>
  );
}

export default EditarPacienteModal;
