import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { AlertList, Button, Field, FieldRow } from '../../components/ui';
import {
  evaluarSignosVitales, referenciasParaEdad, validarMedicion,
} from '../../utils/signosVitales';
import styles from './Enfermeria.module.css';

const VACIO = { presion: '', pulso: '', temperatura: '', observaciones: '' };

// Escribe "12080" → "120/80"
const formatearPresion = (valor) => {
  const digitos = valor.replace(/\D/g, '').slice(0, 6);
  return digitos.length > 3 ? `${digitos.slice(0, 3)}/${digitos.slice(3)}` : digitos;
};

const soloEntero = (valor) => valor.replace(/\D/g, '').slice(0, 3);
const soloDecimal = (valor) => valor.replace(',', '.').replace(/[^\d.]/g, '').slice(0, 4);

function SignosVitalesForm({ paciente, onGuardar, onCancelar }) {
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});

  const tieneEdad = String(paciente.edad ?? '').trim() !== '';
  const referencias = referenciasParaEdad(paciente.edad, paciente.sexo);

  // Solo se evalúan los campos completos y válidos
  const erroresActuales = validarMedicion(form);
  const evaluables = {
    presion: erroresActuales.presion ? '' : form.presion,
    pulso: erroresActuales.pulso ? '' : form.pulso,
    temperatura: erroresActuales.temperatura ? '' : form.temperatura,
  };
  const hallazgos = evaluarSignosVitales({ ...evaluables, edad: paciente.edad, sexo: paciente.sexo });
  const completo = Object.keys(erroresActuales).length === 0;
  const mencionaAlergia = /alerg/i.test(form.observaciones);

  const cambiar = (campo, transformar = (v) => v) => (e) => {
    setForm((f) => ({ ...f, [campo]: transformar(e.target.value) }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
  };

  const enviar = (e) => {
    e.preventDefault();
    setErrores(erroresActuales);
    if (!completo) return;
    onGuardar(form);
  };

  return (
    <form className={styles.form} onSubmit={enviar} noValidate>
      <div className={styles.patientBox}>
        <p className={styles.patientName}>{paciente.paciente}</p>
        <p className={styles.patientMeta}>
          {tieneEdad ? `${paciente.edad} años` : 'Edad no registrada'} · {paciente.sexo || 'Sexo no registrado'} · {paciente.consulta}
        </p>
      </div>

      {!tieneEdad && (
        <p className={styles.ageWarning}>
          Recepción no registró la edad. Se usan los rangos de un adulto.
        </p>
      )}

      <Field
        label="Presión arterial (mmHg)"
        inputMode="numeric"
        placeholder="120/80"
        value={form.presion}
        onChange={cambiar('presion', formatearPresion)}
        error={errores.presion}
        hint={`Normal: ${referencias.presion}`}
      />
      <FieldRow>
        <Field
          label="Pulso (lpm)"
          inputMode="numeric"
          placeholder="72"
          value={form.pulso}
          onChange={cambiar('pulso', soloEntero)}
          error={errores.pulso}
          hint={`Normal: ${referencias.pulso}`}
        />
        <Field
          label="Temperatura (°C)"
          inputMode="decimal"
          placeholder="36.5"
          value={form.temperatura}
          onChange={cambiar('temperatura', soloDecimal)}
          error={errores.temperatura}
          hint={`Normal: ${referencias.temperatura}`}
        />
      </FieldRow>
      <Field
        as="textarea"
        label="Observaciones"
        placeholder="Alergias, medicación, notas para la odontóloga…"
        value={form.observaciones}
        onChange={cambiar('observaciones')}
        hint="Si escribes una alergia, también se crea una alerta médica."
      />

      {/* Evaluación en vivo según la edad */}
      {(hallazgos.length > 0 || mencionaAlergia) && (
        <div className={styles.evaluation} aria-live="polite">
          <p className={styles.evaluationTitle}>
            <FontAwesomeIcon icon={faCircleExclamation} /> Se generarán estas alertas médicas
          </p>
          <AlertList
            compact
            alertas={[
              ...hallazgos,
              ...(mencionaAlergia ? [{ tipo: 'alergia', severidad: 'alta', titulo: 'Alergia', descripcion: form.observaciones }] : []),
            ]}
          />
        </div>
      )}
      {completo && hallazgos.length === 0 && !mencionaAlergia && (
        <p className={styles.allNormal} aria-live="polite">
          <FontAwesomeIcon icon={faCircleCheck} /> Signos vitales dentro de lo normal para la edad.
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
