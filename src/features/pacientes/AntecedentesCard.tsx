import { useState, type FormEvent } from 'react';
import {
  faBan, faNotesMedical, faPen, faPlus, faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import {
  Button, Card, EmptyState, Field, IconButton, Modal, useConfirm, useToast,
} from '../../components/ui';
import {
  actualizarAntecedente, registrarAntecedente, TEXTO_ANTECEDENTE, TIPOS_ANTECEDENTE,
} from '../../services/recepcionApi';
import { formatearFecha } from '../../utils/formato';
import styles from './Pacientes.module.css';
import { comoErrorApi } from '../../services/api';
import type { TipoAntecedente } from '../../types/api';
import type { Antecedente, Errores } from '../../types/dominio';

const MAX_DESCRIPCION = 300;

type DatosAntecedente = { tipo: TipoAntecedente; descripcion: string };

const EJEMPLOS: Record<TipoAntecedente, string> = {
  ALERGIA: 'Penicilina (urticaria), látex…',
  ENFERMEDAD: 'Diabetes tipo 2, hipertensión arterial…',
  MEDICACION: 'Metformina 850 mg cada 12 horas…',
  CIRUGIA: 'Apendicectomía en 2015…',
  EMBARAZO: 'Embarazo de 20 semanas…',
  HABITO: 'Fuma 10 cigarrillos al día, bruxismo…',
  OTRO: 'Cualquier dato clínico relevante…',
};

/** Formulario para agregar o editar un antecedente */
interface PropsModal {
  /** Antecedente a editar, o {} para uno nuevo */
  inicial: Partial<Antecedente>;
  onClose: () => void;
  onGuardar: (datos: DatosAntecedente) => Promise<void>;
}

function AntecedenteModal({ inicial, onClose, onGuardar }: PropsModal) {
  const editando = Boolean(inicial?.id);
  const [tipo, setTipo] = useState<TipoAntecedente>(inicial?.tipo || 'ALERGIA');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion || '');
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const texto = descripcion.trim();
    if (texto.length < 2) {
      setErrores({ descripcion: 'Describe el antecedente.' });
      return;
    }
    setGuardando(true);
    try {
      await onGuardar({ tipo, descripcion: texto });
    } catch (err) {
      const error = comoErrorApi(err);
      // 409 (repetido) y otros errores sin campo se muestran bajo la descripción
      setErrores(error.detalles || { descripcion: error.message });
      setGuardando(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editando ? 'Editar antecedente' : 'Nuevo antecedente'}
      description="Se mostrará a enfermería y odontología en cada consulta."
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button type="submit" form="form-antecedente" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      )}
    >
      <form id="form-antecedente" onSubmit={enviar} noValidate className={styles.antecedenteForm}>
        <Field
          as="select"
          label="Tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoAntecedente)}
          disabled={editando}
          error={errores.tipo}
        >
          {TIPOS_ANTECEDENTE.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </Field>
        <Field
          as="textarea"
          label="Descripción"
          placeholder={EJEMPLOS[tipo]}
          value={descripcion}
          onChange={(e) => {
            setDescripcion(e.target.value);
            if (errores.descripcion) setErrores({});
          }}
          error={errores.descripcion}
          hint={tipo === 'ALERGIA'
            ? 'Al recetar, el sistema avisará si un medicamento coincide con esta alergia.'
            : `${descripcion.length}/${MAX_DESCRIPCION}`}
          maxLength={MAX_DESCRIPCION}
        />
      </form>
    </Modal>
  );
}

/**
 * Antecedentes médicos del paciente: se agregan, se editan y, cuando ya no
 * aplican, se marcan así (no se borran).
 */
interface Props {
  cedula: string;
  antecedentes: Antecedente[];
  anteriores?: Antecedente[];
  onCambio: () => void;
}

function AntecedentesCard({ cedula, antecedentes, anteriores = [], onCambio }: Props) {
  const toast = useToast();
  const confirmar = useConfirm();
  const [editando, setEditando] = useState<Partial<Antecedente> | null>(null); // null | {} (nuevo) | antecedente
  const [verAnteriores, setVerAnteriores] = useState(false);

  const guardar = async ({ tipo, descripcion }: DatosAntecedente) => {
    if (editando?.id) {
      await actualizarAntecedente(cedula, editando.id, { descripcion });
      toast.success('Antecedente actualizado.');
    } else {
      await registrarAntecedente(cedula, { tipo, descripcion });
      toast.success('Antecedente registrado.');
    }
    setEditando(null);
    onCambio();
  };

  const cambiarVigencia = async (a: Antecedente, vigente: boolean) => {
    if (!vigente) {
      const ok = await confirmar({
        title: '¿Este antecedente ya no aplica?',
        message: `"${a.descripcion}" dejará de mostrarse en las consultas. Quedará en la historia del paciente.`,
        confirmText: 'Ya no aplica',
      });
      if (!ok) return;
    }
    try {
      await actualizarAntecedente(cedula, a.id, { vigente });
      toast.success(vigente ? 'Antecedente reactivado.' : 'Antecedente marcado como que ya no aplica.');
      onCambio();
    } catch (err) {
      const error = comoErrorApi(err);
      toast.error(error.message);
    }
  };

  return (
    <Card
      title="Antecedentes médicos"
      icon={faNotesMedical}
      actions={<Button size="sm" variant="secondary" icon={faPlus} onClick={() => setEditando({})}>Agregar</Button>}
    >
      {antecedentes.length ? (
        <ul className={styles.antecedenteList}>
          {antecedentes.map((a) => (
            <li key={a.id} className={a.tipo === 'ALERGIA' ? styles.antecedenteAlergia : undefined}>
              <div>
                <p><strong>{TEXTO_ANTECEDENTE[a.tipo] || a.tipo}:</strong> {a.descripcion}</p>
                {a.registradoPor && (
                  <p className={styles.antecedenteMeta}>{a.registradoPor} · {formatearFecha(a.creadoEn)}</p>
                )}
              </div>
              <span className={styles.antecedenteActions}>
                <IconButton icon={faPen} label={`Editar ${a.descripcion}`} onClick={() => setEditando(a)} />
                <IconButton icon={faBan} label={`${a.descripcion}: ya no aplica`} onClick={() => cambiarVigencia(a, false)} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title="Sin antecedentes registrados" text="Alergias, enfermedades, medicación, cirugías o hábitos." />
      )}

      {anteriores.length > 0 && (
        <div className={styles.antecedentesAnteriores}>
          <button type="button" className={styles.linkButton} onClick={() => setVerAnteriores((v) => !v)} aria-expanded={verAnteriores}>
            {verAnteriores ? 'Ocultar' : 'Ver'} los que ya no aplican ({anteriores.length})
          </button>
          {verAnteriores && (
            <ul className={styles.antecedenteList}>
              {anteriores.map((a) => (
                <li key={a.id} className={styles.antecedenteInactivo}>
                  <p><strong>{TEXTO_ANTECEDENTE[a.tipo] || a.tipo}:</strong> {a.descripcion}</p>
                  <IconButton icon={faRotateLeft} label={`Reactivar ${a.descripcion}`} onClick={() => cambiarVigencia(a, true)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editando && <AntecedenteModal inicial={editando} onClose={() => setEditando(null)} onGuardar={guardar} />}
    </Card>
  );
}

export default AntecedentesCard;
