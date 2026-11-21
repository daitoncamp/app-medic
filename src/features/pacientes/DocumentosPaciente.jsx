import { useState } from 'react';
import {
  faFileMedical, faFilePdf, faPrescription,
} from '@fortawesome/free-solid-svg-icons';
import { Button, Card, EmptyState, useToast } from '../../components/ui';
import { obtenerSesion, ROLES } from '../../services/authService';
import { ESTADOS_CITA } from '../../services/clinica';
import { emitirReceta } from '../../services/consultaApi';
import { formatearFechaHora } from '../../utils/formato';
import RecetaModal from '../consulta/RecetaModal';
import { generarHistorialPDF, generarRecetaPDF } from '../consulta/pdf';
import styles from './Pacientes.module.css';

// Quién puede hacer qué con los documentos del paciente
const PERMISOS_DOCUMENTOS = {
  // Descargar el historial y volver a descargar recetas ya emitidas
  descargar: [ROLES.ODONTOLOGA, ROLES.RECEPCIONISTA, ROLES.ADMIN],
  // Emitir una receta nueva: solo quien atiende
  emitirReceta: [ROLES.ODONTOLOGA],
};

// Desde la ficha, la receta queda asociada a la última cita en consulta o atendida
const ESTADOS_CON_CONSULTA = [ESTADOS_CITA.EN_CONSULTA, ESTADOS_CITA.ATENDIDA];

/** Datos del paciente en el formato que esperan los PDF */
const pacienteParaPDF = (ficha) => {
  const { paciente, citas, alertas, ultimosSignos } = ficha;
  const ultimaCita = [...citas].sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)).pop();
  const alergias = [
    ...ficha.antecedentes.filter((a) => a.tipo === 'ALERGIA').map((a) => a.descripcion),
    ...alertas.filter((a) => a.tipo === 'alergia').map((a) => a.descripcion),
  ];
  return {
    id: ultimaCita?.id,
    nombre: paciente.nombre,
    cedula: paciente.cedula,
    edad: paciente.edad,
    sexo: paciente.sexo,
    tratamiento: ultimaCita?.consulta,
    alergias: alergias.length ? [...new Set(alergias)].join('; ') : 'Ninguna',
    alergiasLista: [...new Set(alergias)],
    signosVitales: ultimosSignos,
    alertas,
  };
};

/**
 * Documentos del paciente: historial clínico y recetas.
 * Están disponibles aunque la consulta ya se haya finalizado.
 */
function DocumentosPaciente({ ficha, onCambio }) {
  const toast = useToast();
  const sesion = obtenerSesion();
  const rol = sesion?.rol;
  const [receta, setReceta] = useState(false);
  const [generando, setGenerando] = useState(null);

  if (!PERMISOS_DOCUMENTOS.descargar.includes(rol)) return null;

  const paciente = pacienteParaPDF(ficha);
  const citaParaReceta = [...ficha.citas]
    .filter((c) => ESTADOS_CON_CONSULTA.includes(c.estado))
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`))
    .pop();
  const puedeEmitir = PERMISOS_DOCUMENTOS.emitirReceta.includes(rol) && Boolean(citaParaReceta);

  const ejecutar = async (clave, accion, mensaje) => {
    setGenerando(clave);
    try {
      await accion();
      toast.success(mensaje);
    } catch {
      toast.error('No se pudo generar el documento.');
    } finally {
      setGenerando(null);
    }
  };

  return (
    <Card
      title="Documentos"
      icon={faFileMedical}
      actions={puedeEmitir && (
        <Button size="sm" variant="secondary" icon={faPrescription} onClick={() => setReceta(true)}>Nueva receta</Button>
      )}
    >
      <div className={styles.documents}>
        <div className={styles.document}>
          <div>
            <p className={styles.documentTitle}>Historial clínico</p>
            <p className={styles.documentMeta}>
              {ficha.historial.length} {ficha.historial.length === 1 ? 'procedimiento' : 'procedimientos'} · incluye odontograma y alertas
            </p>
          </div>
          <Button
            size="sm"
            icon={faFilePdf}
            disabled={generando === 'historial'}
            onClick={() => ejecutar(
              'historial',
              () => generarHistorialPDF(paciente, [...ficha.historial].reverse(), {
                odontograma: ficha.odontograma,
                firmante: rol === ROLES.ODONTOLOGA ? sesion.nombre : undefined,
              }),
              'Historial descargado.',
            )}
          >
            Descargar
          </Button>
        </div>

        <p className={styles.documentsSubtitle}>Recetas emitidas</p>
        {ficha.recetas.length ? (
          ficha.recetas.map((r) => (
            <div key={r.id} className={styles.document}>
              <div>
                <p className={styles.documentTitle}>
                  {r.medicamento} · {r.dosis}
                  {r.medicamentos?.length > 1 && ` y ${r.medicamentos.length - 1} más`}
                </p>
                <p className={styles.documentMeta}>{r.numero} · {formatearFechaHora(r.fechaRegistro)}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={faFilePdf}
                disabled={generando === r.id}
                onClick={() => ejecutar(r.id, () => generarRecetaPDF(paciente, r), 'Receta descargada.')}
              >
                Descargar
              </Button>
            </div>
          ))
        ) : (
          <EmptyState compact title="Sin recetas" text={puedeEmitir ? 'Usa “Nueva receta” para emitir una.' : 'La odontóloga aún no ha emitido recetas.'} />
        )}
      </div>

      {receta && (
        <RecetaModal
          open
          paciente={paciente}
          onClose={() => setReceta(false)}
          onGenerar={async (datosReceta) => {
            let guardada;
            try {
              guardada = await emitirReceta(citaParaReceta.id, datosReceta);
            } catch (error) {
              if (!error.detalles) toast.error(error.message);
              throw error;
            }
            setReceta(false);
            onCambio?.();
            await ejecutar('nueva', () => generarRecetaPDF(paciente, guardada), `Receta ${guardada.numero} emitida y descargada.`);
          }}
        />
      )}
    </Card>
  );
}

export default DocumentosPaciente;
