import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Button, Field, FieldRow } from '../../components/ui';
import {
  requerido, validarFormulario, validarPresion, validarRango,
} from '../../utils/validaciones';
import styles from './Enfermeria.module.css';

const VACIO = { presion: '', pulso: '', temperatura: '', observaciones: '' };

const REGLAS = {
  presion: [requerido, validarPresion],
  pulso: [requerido, (v) => validarRango(v, 40, 190, 'bpm')],
  temperatura: [requerido, (v) => validarRango(v, 34, 42, '°C')],
};

// Escribe "12080" → "120/80"
const formatearPresion = (valor) => {
  const digitos = valor.replace(/\D/g, '').slice(0, 6);
  return digitos.length > 3 ? `${digitos.slice(0, 3)}/${digitos.slice(3)}` : digitos;
};

const soloNumero = (valor) => valor.replace(',', '.').replace(/[^\d.]/g, '');

function SignosVitalesForm({ paciente, onGuardar, onCancelar }) {
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});

  const cambiar = (campo, transformar = (v) => v) => (e) => {
    setForm((f) => ({ ...f, [campo]: transformar(e.target.value) }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
  };

  const enviar = (e) => {
    e.preventDefault();
    const nuevos = validarFormulario(form, REGLAS);
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    onGuardar({
      presion: form.presion,
      pulso: `${form.pulso} bpm`,
      temperatura: `${form.temperatura}°C`,
      observaciones: form.observaciones.trim() || 'Ninguna',
    });
  };

  const mencionaAlergia = /alerg/i.test(form.observaciones);

  return (
    <form className={styles.form} onSubmit={enviar} noValidate>
      <div className={styles.patientBox}>
        <p className={styles.patientName}>{paciente.paciente}</p>
        <p className={styles.patientMeta}>
          {paciente.edad} años · {paciente.sexo} · {paciente.consulta}
        </p>
      </div>

      <Field
        label="Presión arterial (mmHg)"
        inputMode="numeric"
        placeholder="120/80"
        value={form.presion}
        onChange={cambiar('presion', formatearPresion)}
        error={errores.presion}
      />
      <FieldRow>
        <Field label="Pulso (bpm)" inputMode="numeric" placeholder="70" value={form.pulso} onChange={cambiar('pulso', soloNumero)} error={errores.pulso} />
        <Field label="Temperatura (°C)" inputMode="decimal" placeholder="36.5" value={form.temperatura} onChange={cambiar('temperatura', soloNumero)} error={errores.temperatura} />
      </FieldRow>
      <Field
        as="textarea"
        label="Observaciones"
        placeholder="Alergias, medicación, notas para la odontóloga…"
        value={form.observaciones}
        onChange={cambiar('observaciones')}
        hint="Si escribes una alergia, se crea una alerta médica."
      />
      {mencionaAlergia && (
        <p className={styles.allergyNotice}>
          <FontAwesomeIcon icon={faCircleExclamation} /> Se generará una alerta de alergia para este paciente.
        </p>
      )}

      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit">Guardar y enviar a odontología</Button>
      </div>
    </form>
  );
}

export default SignosVitalesForm;
