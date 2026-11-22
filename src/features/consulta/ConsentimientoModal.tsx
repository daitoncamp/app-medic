import { useState, type ChangeEvent, type FormEvent } from 'react';
import { faFileSignature } from '@fortawesome/free-solid-svg-icons';
import { Button, Field, FieldRow, Modal } from '../../components/ui';
import { obtenerSesion } from '../../services/authService';
import {
  MAYORIA_DE_EDAD, PARENTESCOS, PROCEDIMIENTOS_CON_CONSENTIMIENTO, textoConsentimiento,
} from '../../utils/consentimientos';
import { agruparPorGrupo, PROCEDIMIENTOS } from '../../utils/procedimientos';
import {
  requerido, validarCedula, validarFormulario, validarNombre, type Validador,
} from '../../utils/validaciones';
import styles from './Consulta.module.css';
import { comoErrorApi } from '../../services/api';
import type { NuevoConsentimiento } from '../../services/consultaApi';
import type { Errores } from '../../types/dominio';

const GRUPOS_CON_CONSENTIMIENTO = agruparPorGrupo(PROCEDIMIENTOS.filter((p) => p.consentimiento));

type Firmante = { nombre: string; cedula: string; parentesco: string };

const REGLAS_REPRESENTANTE: Record<keyof Firmante, Validador[]> = {
  nombre: [requerido, validarNombre],
  cedula: [requerido, validarCedula],
  parentesco: [requerido],
};

/**
 * Registra el consentimiento informado de un procedimiento.
 * Si el paciente es menor de edad, firma su representante.
 * onRegistrar(datos) es asíncrona; los errores de la API vuelven al formulario.
 */
interface Props {
  paciente: { nombre: string; cedula: string; edad?: number | string };
  procedimientoInicial?: string;
  /** Procedimientos que ya tienen consentimiento en esta consulta */
  yaFirmados?: string[];
  onClose: () => void;
  onRegistrar: (datos: NuevoConsentimiento) => Promise<void>;
}

function ConsentimientoModal({
  paciente, procedimientoInicial, yaFirmados = [], onClose, onRegistrar,
}: Props) {
  const esMenor = Number(paciente.edad) < MAYORIA_DE_EDAD;
  const primeroPendiente = PROCEDIMIENTOS_CON_CONSENTIMIENTO.find((p) => !yaFirmados.includes(p));
  const [procedimiento, setProcedimiento] = useState(
    procedimientoInicial && PROCEDIMIENTOS_CON_CONSENTIMIENTO.includes(procedimientoInicial)
      ? procedimientoInicial
      : primeroPendiente || 'Extracción',
  );
  const [esRepresentante, setEsRepresentante] = useState(esMenor);
  const [firmante, setFirmante] = useState<Firmante>({ nombre: '', cedula: '', parentesco: esMenor ? 'Madre' : 'Representante legal' });
  const [aceptado, setAceptado] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);

  const odontologo = obtenerSesion()?.nombre;
  const datosFirmante = esRepresentante
    ? { nombre: firmante.nombre.trim() || '________________', cedula: firmante.cedula || '__________', parentesco: firmante.parentesco }
    : { nombre: paciente.nombre, cedula: paciente.cedula };
  // Vista previa: el mismo texto que guardará el servidor
  const texto = textoConsentimiento({
    procedimiento, paciente, firmante: datosFirmante, esRepresentante, odontologo,
  });

  const cambiar = (campo: keyof Firmante) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const valor = campo === 'cedula' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value;
    setFirmante((f) => ({ ...f, [campo]: valor }));
    if (errores[`firmante.${campo}`]) setErrores((er) => ({ ...er, [`firmante.${campo}`]: '' }));
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const nuevos: Errores = {};
    if (esRepresentante) {
      Object.entries(validarFormulario(firmante, REGLAS_REPRESENTANTE)).forEach(([k, v]) => { nuevos[`firmante.${k}`] = v; });
      if (firmante.cedula === paciente.cedula) nuevos['firmante.cedula'] = 'Es la cédula del paciente.';
    }
    if (!aceptado) nuevos.aceptado = 'Confirma que se explicó el procedimiento y fue aceptado.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length || guardando) return;

    setGuardando(true);
    try {
      await onRegistrar({
        procedimiento,
        esRepresentante,
        ...(esRepresentante ? { firmante: { ...firmante, nombre: firmante.nombre.trim() } } : {}),
        aceptado: true,
      });
    } catch (err) {
      const error = comoErrorApi(err);
      setErrores(error.detalles || { aceptado: error.message });
      setGuardando(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Consentimiento informado"
      description={`${paciente.nombre} · C.I. ${paciente.cedula}`}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button type="submit" form="form-consentimiento" icon={faFileSignature} disabled={guardando}>
            {guardando ? 'Registrando…' : 'Registrar y descargar para firmar'}
          </Button>
        </>
      )}
    >
      <form id="form-consentimiento" onSubmit={enviar} noValidate className={styles.recipeForm}>
        <Field as="select" label="Procedimiento" value={procedimiento} onChange={(e) => setProcedimiento(e.target.value)} error={errores.procedimiento}>
          {GRUPOS_CON_CONSENTIMIENTO.map((g) => (
            <optgroup key={g.grupo} label={g.grupo}>
              {g.items.map(({ nombre }) => (
                <option key={nombre} value={nombre}>{nombre}{yaFirmados.includes(nombre) ? ' (ya registrado hoy)' : ''}</option>
              ))}
            </optgroup>
          ))}
        </Field>

        {esMenor ? (
          <p className={styles.consentNote}>
            El paciente es menor de edad ({paciente.edad} años): firma su madre, padre o representante legal.
          </p>
        ) : (
          <label className={styles.allergyConfirm}>
            <input type="checkbox" checked={esRepresentante} onChange={(e) => setEsRepresentante(e.target.checked)} />
            Firma un representante (el paciente no puede firmar por sí mismo)
          </label>
        )}
        {errores.esRepresentante && <p className={styles.formError}>{errores.esRepresentante}</p>}

        {esRepresentante && (
          <fieldset className={styles.medicine}>
            <legend className={styles.medicineLegend}>Representante</legend>
            <Field label="Nombres y apellidos" value={firmante.nombre} onChange={cambiar('nombre')} error={errores['firmante.nombre']} />
            <FieldRow>
              <Field label="Cédula" inputMode="numeric" value={firmante.cedula} onChange={cambiar('cedula')} error={errores['firmante.cedula']} />
              <Field as="select" label="Parentesco" value={firmante.parentesco} onChange={cambiar('parentesco')} error={errores['firmante.parentesco']}>
                {PARENTESCOS.map((p) => <option key={p}>{p}</option>)}
              </Field>
            </FieldRow>
          </fieldset>
        )}

        <div className={styles.consentText} aria-label="Texto del consentimiento" tabIndex={0}>
          {texto.split('\n\n').map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
        </div>

        <label className={styles.allergyConfirm}>
          <input
            type="checkbox"
            checked={aceptado}
            onChange={(e) => {
              setAceptado(e.target.checked);
              setErrores((er) => ({ ...er, aceptado: '' }));
            }}
          />
          Expliqué el procedimiento, respondí sus preguntas y {esRepresentante ? 'el representante' : 'el paciente'} lo acepta
        </label>
        {errores.aceptado && <p className={styles.formError} role="alert">{errores.aceptado}</p>}
        <p className={styles.consentNote}>
          Se guarda este texto en la historia y se descarga el PDF para que lo firmen a mano.
        </p>
      </form>
    </Modal>
  );
}

export default ConsentimientoModal;
