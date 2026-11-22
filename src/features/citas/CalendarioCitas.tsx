import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '../../components/ui';
import { ESTADOS_CITA, fechaLocalISO } from '../../services/clinica';
import {
  diasDeSemana, encabezadoDia, NOMBRES_DIAS, semanasDelMes, type Vista,
} from './calendario';
import type { Cita } from '../../types/dominio';
import styles from './Calendario.module.css';

// Color de cada cita según su estado
const CLASE_ESTADO: Record<string, string | undefined> = {
  [ESTADOS_CITA.PENDIENTE]: styles.pendiente,
  [ESTADOS_CITA.CONFIRMADA]: styles.confirmada,
  [ESTADOS_CITA.EN_CONSULTA]: styles.enConsulta,
  [ESTADOS_CITA.ATENDIDA]: styles.atendida,
  [ESTADOS_CITA.NO_ASISTIO]: styles.noAsistio,
  [ESTADOS_CITA.ANULADA]: styles.anulada,
};

const MAX_EN_MES = 3;

const porDia = (citas: Cita[]): Record<string, Cita[]> => citas.reduce<Record<string, Cita[]>>((dias, c) => {
  (dias[c.fecha] ||= []).push(c);
  return dias;
}, {});

const apellido = (nombre = ''): string => {
  const partes = nombre.split(' ');
  return partes.length > 2 ? `${partes[0]} ${partes[2]}` : nombre;
};

function ChipCita({ cita, compacto = false, onClick }: { cita: Cita; compacto?: boolean; onClick: (cita: Cita) => void }) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${CLASE_ESTADO[cita.estado] || ''} ${compacto ? styles.chipCompacto : ''}`}
      onClick={() => onClick(cita)}
      title={`${cita.hora} · ${cita.paciente} · ${cita.consulta} · ${cita.estado}`}
    >
      <span className={styles.chipHora}>{cita.hora}</span>
      <span className={styles.chipNombre}>{compacto ? apellido(cita.paciente) : cita.paciente}</span>
      {!compacto && <span className={styles.chipDetalle}>{cita.consulta} · {cita.estado}</span>}
    </button>
  );
}

/**
 * Calendario de citas por semana o por mes.
 * onCita(cita): abrir el detalle · onDia(fecha): ver la lista de ese día · onNueva(fecha): agendar
 */
interface Props {
  vista: Vista;
  fecha: string;
  citas: Cita[];
  onCita: (cita: Cita) => void;
  onDia: (fecha: string) => void;
  onNueva: (fecha: string) => void;
}

function CalendarioCitas({
  vista, fecha, citas, onCita, onDia, onNueva,
}: Props) {
  const hoy = fechaLocalISO();
  const dias = porDia(citas);

  if (vista === 'semana') {
    return (
      <div className={styles.semana}>
        {diasDeSemana(fecha).map((dia) => {
          const delDia = dias[dia] || [];
          return (
            <section key={dia} className={`${styles.columna} ${dia === hoy ? styles.hoy : ''}`} aria-label={encabezadoDia(dia)}>
              <header className={styles.columnaCabecera}>
                <button type="button" className={styles.diaBoton} onClick={() => onDia(dia)}>
                  {encabezadoDia(dia)}
                </button>
                {dia >= hoy && (
                  <IconButton icon={faPlus} label={`Nueva cita el ${encabezadoDia(dia)}`} onClick={() => onNueva(dia)} />
                )}
              </header>
              <div className={styles.columnaCitas}>
                {delDia.length
                  ? delDia.map((c) => <ChipCita key={c.id} cita={c} onClick={onCita} />)
                  : <p className={styles.vacio}>Sin citas</p>}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  const mes = fecha.slice(0, 7);
  return (
    <div className={styles.mes}>
      <div className={styles.mesCabecera} aria-hidden="true">
        {NOMBRES_DIAS.map((d) => <span key={d}>{d}</span>)}
      </div>
      {semanasDelMes(fecha).map((semana) => (
        <div key={semana[0]} className={styles.mesFila}>
          {semana.map((dia) => {
            const delDia = dias[dia] || [];
            const abiertas = delDia.filter((c) => c.estado === ESTADOS_CITA.PENDIENTE || c.estado === ESTADOS_CITA.CONFIRMADA).length;
            return (
              <div
                key={dia}
                className={`${styles.celda} ${dia.slice(0, 7) !== mes ? styles.fueraDeMes : ''} ${dia === hoy ? styles.hoy : ''}`}
              >
                <button
                  type="button"
                  className={styles.celdaNumero}
                  onClick={() => onDia(dia)}
                  aria-label={`${encabezadoDia(dia)}: ${delDia.length} ${delDia.length === 1 ? 'cita' : 'citas'}. Ver lista`}
                >
                  {Number(dia.slice(8))}
                  {delDia.length > 0 && (
                    <span className={`${styles.total} ${abiertas ? styles.totalAbiertas : ''}`}>{delDia.length}</span>
                  )}
                </button>
                <div className={styles.celdaCitas}>
                  {delDia.slice(0, MAX_EN_MES).map((c) => <ChipCita key={c.id} cita={c} compacto onClick={onCita} />)}
                  {delDia.length > MAX_EN_MES && (
                    <button type="button" className={styles.mas} onClick={() => onDia(dia)}>
                      +{delDia.length - MAX_EN_MES} más
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default CalendarioCitas;
