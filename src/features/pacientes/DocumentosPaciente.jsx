import { useState } from 'react';
import {
  faFileMedical, faFilePdf, faPrescription,
} from '@fortawesome/free-solid-svg-icons';
import { Button, Card, EmptyState, useToast } from '../../components/ui';
import { obtenerSesion, ROLES } from '../../services/authService';
import { registrarReceta } from '../../services/clinica';
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

/** Datos del paciente en el formato que esperan los PDF */
const pacienteParaPDF = (ficha) => {
  const { paciente, citas, alertas, ultimosSignos } = ficha;
  const ultimaCita = [...citas].sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)).pop();
  const alergias = alertas.filter((a) => a.tipo === 'alergia').map((a) => a.descripcion);
  return {
    id: ultimaCita?.id,
    nombre: paciente.nombre,
    cedula: paciente.cedula,
    edad: paciente.edad,
    sexo: paciente.sexo,
    tratamiento: ultimaCita?.consulta,
    alergias: alergias.length ? [...new Set(alergias)].join('; ') : 'Ninguna',
    signosVitales: ultimosSignos,
    alertas,
  };
};

/**
 * Documentos del paciente: historial clínico y recetas.
 * Están disponibles aunque la consulta ya se haya finalizado.
 */
function DocumentosPaciente({ ficha }) {
  const toast = useToast();
  const rol = obtenerSesion()?.rol;
  const [receta, setReceta] = useState(false);
  const [generando, setGenerando] = useState(null);

  if (!PERMISOS_DOCUMENTOS.descargar.includes(rol)) return null;

  const paciente = pacienteParaPDF(ficha);
  const puedeEmitir = PERMISOS_DOCUMENTOS.emitirReceta.includes(rol);

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
              () => generarHistorialPDF(paciente, [...ficha.historial].reverse(), { odontograma: ficha.odontograma }),
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
                <p className={styles.documentTitle}>{r.medicamento} · {r.dosis}</p>
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
            const guardada = registrarReceta(paciente, datosReceta);
            await ejecutar('nueva', () => generarRecetaPDF(paciente, guardada || datosReceta), 'Receta emitida y descargada.');
            setReceta(false);
          }}
        />
      )}
    </Card>
  );
}

export default DocumentosPaciente;
