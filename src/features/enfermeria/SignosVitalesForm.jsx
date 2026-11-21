import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faCircleExclamation, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { AlertList, Button, Field, FieldRow } from '../../components/ui';
import { alertasDeLaToma, referenciasParaEdad, validarMedicion } from '../../utils/signosVitales';
import { edadTexto } from '../../utils/formato';
import styles from './Enfermeria.module.css';

const VACIO = { presion: '', pulso: '', temperatura: '', observaciones: '' };

// Escribe "12080" → "120/80"
const formatearPresion = (valor) => {
  const digitos = valor.replace(/\D/g, '').slice(0, 6);
  return digitos.length > 3 ? `${digitos.slice(0, 3)}/${digitos.slice(3)}` : digitos;
};

const soloEntero = (valor) => valor.replace(/\D/g, '').slice(0, 3);
const soloDecimal = (valor) => valor.replace(',', '.').replace(/[^\d.]/g, '').slice(0, 4);

/**
 * onGuardar(form) es asíncrona: si el servidor responde con errores por campo
 * (error.detalles), se muestran junto a cada campo.
 */
function SignosVitalesForm({ paciente, onGuardar, onCancelar }) {
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const tieneEdad = String(paciente.edad ?? '').trim() !== '';
  const referencias = referenciasParaEdad(paciente.edad, paciente.sexo);

  // Solo se evalúan los campos completos y válidos
  const erroresActuales = validarMedicion(form);
  const evaluables = {
    presion: erroresActuales.presion ? '' : form.presion,
    pulso: erroresActuales.pulso ? '' : form.pulso,
    temperatura: erroresActuales.temperatura ? '' : form.temperatura,
  };
  // Vista previa con las mismas reglas que aplica el servidor al guardar
  const alertas = alertasDeLaToma({
    ...evaluables, observaciones: form.observaciones, edad: paciente.edad, sexo: paciente.sexo,
  });
  const completo = Object.keys(erroresActuales).length === 0;
  const alergiasConocidas = (paciente.antecedentes || []).filter((a) => a.tipo === 'ALERGIA');
  const otrosAntecedentes = (paciente.antecedentes || []).filter((a) => a.tipo !== 'ALERGIA');

  const cambiar = (campo, transformar = (v) => v) => (e) => {
    setForm((f) => ({ ...f, [campo]: transformar(e.target.value) }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    setErrores(erroresActuales);
    if (!completo || guardando) return;
    setGuardando(true);
    try {
      await onGuardar(form);
    } catch (error) {
      if (error.detalles) setErrores(error.detalles);
      setGuardando(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={enviar} noValidate>
      <div className={styles.patientBox}>
        <p className={styles.patientName}>{paciente.paciente}</p>
        <p className={styles.patientMeta}>
          {tieneEdad ? edadTexto(paciente.datosPaciente?.fechaNacimiento) || `${paciente.edad} años` : 'Edad no registrada'}
          {' · '}{paciente.sexo || 'Sexo no registrado'} · {paciente.consulta}
        </p>
      </div>

      {alergiasConocidas.length > 0 && (
        <div className={styles.knownAllergies} role="note">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          <div>
            <p className={styles.knownTitle}>Alergias registradas</p>
            <p>{alergiasConocidas.map((a) => a.descripcion).join(' · ')}</p>
          </div>
        </div>
      )}
      {otrosAntecedentes.length > 0 && (
        <ul className={styles.background}>
          {otrosAntecedentes.map((a) => (
            <li key={a.id}><strong>{a.texto}:</strong> {a.descripcion}</li>
          ))}
        </ul>
      )}

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
      {alertas.length > 0 && (
        <div className={styles.evaluation} aria-live="polite">
          <p className={styles.evaluationTitle}>
            <FontAwesomeIcon icon={faCircleExclamation} /> Se generarán estas alertas médicas
          </p>
          <AlertList compact alertas={alertas} />
        </div>
      )}
      {completo && alertas.length === 0 && (
        <p className={styles.allNormal} aria-live="polite">
          <FontAwesomeIcon icon={faCircleCheck} /> Signos vitales dentro de lo normal para la edad.
        </p>
      )}

      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onCancelar} disabled={guardando}>Cancelar</Button>
        <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar y enviar a odontología'}</Button>
      </div>
    </form>
  );
}

export default SignosVitalesForm;
