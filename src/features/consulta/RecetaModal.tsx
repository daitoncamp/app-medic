import { useState, type ChangeEvent, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faPlus, faTrash, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Button, Field, FieldRow, IconButton, Modal } from '../../components/ui';
import { revisarReceta } from '../../utils/alergias';
import { requerido, validarFormulario } from '../../utils/validaciones';
import styles from './Consulta.module.css';
import { comoErrorApi } from '../../services/api';
import type { NuevaReceta } from '../../services/consultaApi';
import type { Medicamento } from '../../types/api';
import type { Errores } from '../../types/dominio';
import type { Validador } from '../../utils/validaciones';

const MEDICAMENTO_VACIO: Medicamento = { medicamento: '', dosis: '', frecuencia: '', duracion: '' };
const MAX_MEDICAMENTOS = 5;

// "Cada 6-8 horas" es válido; "-3 días" no
const sinNegativos: Validador = (v) => (/(^|\s)-\s*\d/.test(String(v)) ? 'Ingrese un valor correcto (sin números negativos).' : '');

const REGLAS: Record<keyof Medicamento, Validador[]> = {
  medicamento: [requerido, (v) => (/\d/.test(String(v)) ? 'Escriba solo el nombre (la dosis va aparte).' : '')],
  dosis: [requerido, sinNegativos],
  frecuencia: [requerido, sinNegativos],
  duracion: [requerido, sinNegativos],
};

/** Valida cada medicamento; los errores quedan como "medicamentos.0.dosis" (igual que la API) */
const validar = (medicamentos: Medicamento[]): Errores => {
  const errores: Errores = {};
  medicamentos.forEach((m, i) => {
    Object.entries(validarFormulario(m, REGLAS)).forEach(([campo, mensaje]) => {
      errores[`medicamentos.${i}.${campo}`] = mensaje;
    });
  });
  return errores;
};

/**
 * Receta con uno o varios medicamentos.
 * onGenerar({ medicamentos, indicaciones }) es asíncrona; si la API devuelve
 * errores por campo (error.detalles), se muestran en el formulario.
 */
interface Props {
  open: boolean;
  /** Nombre y alergias del paciente para mostrar el aviso */
  paciente: { nombre: string; alergias?: string; alergiasLista?: string[] } | null | undefined;
  onClose: () => void;
  onGenerar: (receta: NuevaReceta) => Promise<void>;
}

function RecetaModal({ open, paciente, onClose, onGenerar }: Props) {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([{ ...MEDICAMENTO_VACIO }]);
  const [indicaciones, setIndicaciones] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [confirmaAlergias, setConfirmaAlergias] = useState(false);

  // Aviso en vivo si un medicamento coincide con una alergia registrada
  const coincidencias = revisarReceta(medicamentos, paciente?.alergiasLista || []);
  const avisoDe = (i: number) => coincidencias.find((c) => c.indice === i);

  const cambiar = (i: number, campo: keyof Medicamento) => (e: ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setMedicamentos((lista) => lista.map((m, j) => (j === i ? { ...m, [campo]: valor } : m)));
    const clave = `medicamentos.${i}.${campo}`;
    if (errores[clave]) setErrores((er) => ({ ...er, [clave]: '' }));
  };

  const agregar = () => setMedicamentos((lista) => [...lista, { ...MEDICAMENTO_VACIO }]);
  const quitar = (i: number) => {
    setMedicamentos((lista) => lista.filter((_, j) => j !== i));
    setErrores({});
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const nuevos = validar(medicamentos);
    if (coincidencias.length && !confirmaAlergias) {
      nuevos.confirmaAlergias = 'Confirma que revisaste la alergia o cambia el medicamento.';
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length || guardando) return;
    setGuardando(true);
    try {
      await onGenerar({
        medicamentos: medicamentos.map((m) => ({
          medicamento: m.medicamento.trim(), dosis: m.dosis.trim(), frecuencia: m.frecuencia.trim(), duracion: m.duracion.trim(),
        })),
        indicaciones: indicaciones.trim(),
        confirmarAlergias: coincidencias.length > 0 && confirmaAlergias,
      });
    } catch (err) {
      const error = comoErrorApi(err);
      if (error.detalles) setErrores(error.detalles);
    } finally {
      setGuardando(false);
    }
  };

  const error = (i: number, campo: keyof Medicamento) => errores[`medicamentos.${i}.${campo}`];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Receta médica"
      description={paciente?.alergias && paciente.alergias !== 'Ninguna'
        ? `${paciente.nombre} · Alergias: ${paciente.alergias}`
        : paciente?.nombre}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button type="submit" form="form-receta" icon={faFilePdf} disabled={guardando}>
            {guardando ? 'Emitiendo…' : 'Emitir y descargar PDF'}
          </Button>
        </>
      )}
    >
      <form id="form-receta" onSubmit={enviar} noValidate className={styles.recipeForm}>
        {medicamentos.map((m, i) => (
          <fieldset key={i} className={styles.medicine}>
            <legend className={styles.medicineLegend}>
              Medicamento {medicamentos.length > 1 ? i + 1 : ''}
              {medicamentos.length > 1 && (
                <IconButton icon={faTrash} label={`Quitar medicamento ${i + 1}`} onClick={() => quitar(i)} />
              )}
            </legend>
            <Field
              label="Nombre"
              placeholder="Ibuprofeno"
              value={m.medicamento}
              onChange={cambiar(i, 'medicamento')}
              error={error(i, 'medicamento')}
              hint={avisoDe(i) && `⚠ Posible alergia: ${avisoDe(i)?.alergia}`}
            />
            <FieldRow columns={3}>
              <Field label="Dosis" placeholder="400 mg" value={m.dosis} onChange={cambiar(i, 'dosis')} error={error(i, 'dosis')} />
              <Field label="Frecuencia" placeholder="Cada 8 horas" value={m.frecuencia} onChange={cambiar(i, 'frecuencia')} error={error(i, 'frecuencia')} />
              <Field label="Duración" placeholder="3 días" value={m.duracion} onChange={cambiar(i, 'duracion')} error={error(i, 'duracion')} />
            </FieldRow>
          </fieldset>
        ))}
        {medicamentos.length < MAX_MEDICAMENTOS && (
          <Button variant="ghost" size="sm" icon={faPlus} onClick={agregar} className={styles.addMedicine}>
            Agregar otro medicamento
          </Button>
        )}
        <Field
          as="textarea"
          label="Indicaciones"
          placeholder="Tomar después de las comidas…"
          value={indicaciones}
          onChange={(e) => setIndicaciones(e.target.value)}
          error={errores.indicaciones}
        />
        {coincidencias.length > 0 && (
          <div className={styles.allergyWarning} role="alert">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            <div>
              <p className={styles.allergyTitle}>Posible alergia</p>
              <ul>
                {coincidencias.map((c) => <li key={c.indice}><strong>{c.medicamento}</strong>: {c.alergia}</li>)}
              </ul>
              <label className={styles.allergyConfirm}>
                <input
                  type="checkbox"
                  checked={confirmaAlergias}
                  onChange={(e) => {
                    setConfirmaAlergias(e.target.checked);
                    setErrores((er) => ({ ...er, confirmaAlergias: '' }));
                  }}
                />
                Revisé la alergia y deseo emitir la receta igualmente
              </label>
              {errores.confirmaAlergias && <p className={styles.formError}>{errores.confirmaAlergias}</p>}
            </div>
          </div>
        )}
        {errores.medicamentos && <p className={styles.formError} role="alert">{errores.medicamentos}</p>}
      </form>
    </Modal>
  );
}

export default RecetaModal;
