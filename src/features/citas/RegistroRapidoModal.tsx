import { useState, type FormEvent } from 'react';
import { Button, Modal } from '../../components/ui';
import { buscarPacientePorCedula, erroresDeFormulario } from '../../services/recepcionApi';
import { reglasPaciente, validarFormulario } from '../../utils/validaciones';
import CamposPaciente from './CamposPaciente';
import { PACIENTE_VACIO, pacienteAFormulario } from './paciente';
import styles from './Citas.module.css';
import { comoErrorApi } from '../../services/api';
import type { Errores, FormularioPaciente } from '../../types/dominio';
import type { CambiarCampo } from './CamposPaciente';

interface Props {
  open: boolean;
  onClose: () => void;
  onGuardar: (form: FormularioPaciente) => Promise<void>;
}

/** Paciente que llega sin cita: se registra y pasa directo a la sala de espera */
function RegistroRapidoModal({ open, onClose, onGuardar }: Props) {
  const [form, setForm] = useState<FormularioPaciente>(PACIENTE_VACIO);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cambiar: CambiarCampo = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
    if (campo === 'cedula') setAviso('');
  };

  const alCompletarCedula = async (cedula: string) => {
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

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const nuevos = validarFormulario(form, reglasPaciente);
    setErrores(nuevos);
    setErrorGeneral('');
    if (Object.keys(nuevos).length) return;
    setGuardando(true);
    try {
      await onGuardar(form);
    } catch (err) {
      const error = comoErrorApi(err);
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
