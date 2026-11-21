import { useState } from 'react';
import { Button, Modal } from '../../components/ui';
import { buscarPacientePorCedula, erroresDeFormulario } from '../../services/recepcionApi';
import { reglasPaciente, validarFormulario } from '../../utils/validaciones';
import CamposPaciente from './CamposPaciente';
import { PACIENTE_VACIO, pacienteAFormulario } from './paciente';
import styles from './Citas.module.css';

/** Paciente que llega sin cita: se registra y pasa directo a la sala de espera */
function RegistroRapidoModal({ open, onClose, onGuardar }) {
  const [form, setForm] = useState(PACIENTE_VACIO);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
    if (campo === 'cedula') setAviso('');
  };

  const alCompletarCedula = async (cedula) => {
    try {
      const existente = await buscarPacientePorCedula(cedula);
      if (existente) {
        setForm(pacienteAFormulario(existente));
        setErrores({});
        setAviso(`Paciente encontrado: ${existente.nombre}.`);
      }
    } catch {
      // se llena a mano
    }
  };

  const enviar = async (e) => {
    e.preventDefault();
    const nuevos = validarFormulario(form, reglasPaciente);
    setErrores(nuevos);
    setErrorGeneral('');
    if (Object.keys(nuevos).length) return;
    setGuardando(true);
    try {
      await onGuardar(form);
    } catch (error) {
      const porCampo = erroresDeFormulario(error);
      if (Object.keys(porCampo).length) setErrores(porCampo);
      else setErrorGeneral(error.message);
      setGuardando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registro rápido"
      description="Para pacientes que llegan sin cita. Se crea una revisión para ahora y pasa a la sala de espera de enfermería."
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-registro" disabled={guardando}>{guardando ? 'Registrando…' : 'Registrar y enviar'}</Button>
        </>
      )}
    >
      <form id="form-registro" className={styles.form} onSubmit={enviar} noValidate>
        {errorGeneral && <p className={styles.formError} role="alert">{errorGeneral}</p>}
        <CamposPaciente form={form} errores={errores} cambiar={cambiar} onCedula={alCompletarCedula} avisoCedula={aviso} />
      </form>
    </Modal>
  );
}

export default RegistroRapidoModal;
