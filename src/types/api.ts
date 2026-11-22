// ==================== RESPUESTAS DE LA API ====================
// Forma exacta del JSON que envía el backend (ver backend/src/lib/serializar.js
// y las rutas). Las fechas llegan como texto ISO. Los servicios convierten estos
// datos a la forma que usan las pantallas (ver dominio.ts).

export type RolApi = 'ADMIN' | 'RECEPCIONISTA' | 'ENFERMERA' | 'ODONTOLOGA';
export type EstadoCitaApi = 'PENDIENTE' | 'CONFIRMADA' | 'PREPARADA' | 'ATENDIDA' | 'NO_ASISTIO' | 'ANULADA';
export type SexoApi = 'FEMENINO' | 'MASCULINO' | 'OTRO';
export type SeveridadApi = 'CRITICA' | 'ALTA' | 'MODERADA';
export type TipoAlertaApi = 'SIGNOS_VITALES' | 'ALERGIA' | 'ANTECEDENTE';
export type EstadoProcedimientoApi = 'COMPLETADO' | 'EN_PROCESO' | 'PENDIENTE';
export type TipoAntecedente = 'ALERGIA' | 'ENFERMEDAD' | 'MEDICACION' | 'CIRUGIA' | 'EMBARAZO' | 'HABITO' | 'OTRO';
export type CanalRecordatorio = 'WHATSAPP' | 'SMS' | 'CORREO';
export type Cara = 'VESTIBULAR' | 'LINGUAL' | 'MESIAL' | 'DISTAL' | 'OCLUSAL';
export type EstadoPiezaApi = 'SANO' | 'CARIES' | 'TRATADO' | 'OBSERVACION' | 'AUSENTE';

/** Fecha y hora en texto ISO ("2026-11-21T14:30:00.000Z") */
export type FechaISO = string;

export interface UsuarioApi {
  id: string;
  nombre: string;
  email: string;
  rol: RolApi;
  activo: boolean;
  debeCambiarPassword: boolean;
  ultimoAcceso: FechaISO | null;
  creadoEn: FechaISO;
}

export interface PacienteApi {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  nombre: string;
  /** YYYY-MM-DD */
  fechaNacimiento: string;
  edad: number;
  edadMeses: number;
  sexo: SexoApi;
  telefono: string;
  correo: string | null;
  contactoEmergenciaNombre: string | null;
  contactoEmergenciaTelefono: string | null;
}

export interface CitaApi {
  id: string;
  /** YYYY-MM-DD en hora de Ecuador */
  fecha: string;
  /** HH:mm */
  hora: string;
  inicio: FechaISO;
  duracionMin: number;
  tipoConsulta: string;
  estado: EstadoCitaApi;
  confirmadaEn: FechaISO | null;
  llegadaEn: FechaISO | null;
  preparadaEn: FechaISO | null;
  atendidaEn: FechaISO | null;
  anuladaEn: FechaISO | null;
  motivoAnulacion: string | null;
  paciente?: PacienteApi;
}

export interface SignosApi {
  id: string;
  presionSistolica: number;
  presionDiastolica: number;
  pulso: number;
  temperatura: number;
  frecuenciaRespiratoria: number | null;
  saturacion: number | null;
  observaciones: string | null;
  edadMeses: number | null;
  creadoEn: FechaISO;
  registradoPor?: string;
}

export interface AlertaApi {
  id: string;
  citaId: string | null;
  tipo: TipoAlertaApi;
  signo: string | null;
  severidad: SeveridadApi;
  titulo: string;
  descripcion: string;
  creadoEn: FechaISO;
  /** Nombre del paciente (solo en listas de varias personas) */
  paciente?: string;
  cedula?: string;
}

export interface AntecedenteApi {
  id: string;
  tipo: TipoAntecedente;
  descripcion: string;
  vigente?: boolean;
  creadoEn?: FechaISO;
  actualizadoEn?: FechaISO;
  registradoPor?: string;
}

export interface DiagnosticoApi {
  id: string;
  citaId?: string;
  piezas: number[];
  procedimiento: string;
  descripcion: string;
  notas: string | null;
  estado: EstadoProcedimientoApi;
  creadoEn: FechaISO;
  odontologo?: string;
}

export interface Medicamento {
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
}

export interface RecetaApi {
  id: string;
  numero: string;
  citaId: string;
  indicaciones: string | null;
  anuladaEn: FechaISO | null;
  creadoEn: FechaISO;
  odontologo?: string;
  medicamentos: Medicamento[];
}

export interface ConsentimientoApi {
  id: string;
  citaId: string;
  procedimiento: string;
  textoAceptado: string;
  firmanteNombre: string;
  firmanteCedula: string;
  esRepresentante: boolean;
  aceptadoEn: FechaISO;
  odontologo?: string;
}

export interface RecordatorioApi {
  id: string;
  canal: CanalRecordatorio;
  estado: string;
  enviadoEn: FechaISO | null;
}

/** Odontograma por pieza: { 16: { completa: 'CARIES', caras: { OCLUSAL: 'TRATADO' } } } */
export interface MarcaPiezaApi {
  completa: EstadoPiezaApi | null;
  caras: Partial<Record<Cara, EstadoPiezaApi>>;
}
export type OdontogramaApi = Record<string, MarcaPiezaApi>;

// ===== Respuestas compuestas =====

export interface FichaApi {
  paciente: PacienteApi;
  antecedentes: AntecedenteApi[];
  alertas: AlertaApi[];
  odontograma: OdontogramaApi;
  citas: (CitaApi & {
    signosVitales: Omit<SignosApi, 'id' | 'edadMeses' | 'registradoPor'> | null;
    diagnosticos: DiagnosticoApi[];
    recetas: RecetaApi[];
    consentimientos: ConsentimientoApi[];
  })[];
}

export type CitaEnSalaApi = CitaApi & {
  antecedentes?: Pick<AntecedenteApi, 'id' | 'tipo' | 'descripcion'>[];
  signosVitales?: SignosApi | null;
  alertas?: AlertaApi[];
};

export interface SalaApi {
  enEspera: CitaEnSalaApi[];
  preparados: CitaEnSalaApi[];
  alertasHoy: AlertaApi[];
  ultimasAtenciones: (SignosApi & { paciente: string; cedula: string; tipoConsulta: string })[];
  metricas: { enEspera: number; preparadosHoy: number; esperaPromedioMin: number | null };
}

export interface AgendaApi {
  agenda: (CitaApi & { signosVitales: SignosApi | null; alertas: AlertaApi[]; alergias: string[] })[];
  metricas: {
    preparados: number;
    sinFinalizarAnteriores: number;
    atendidosHoy: number;
    conAlertas: number;
    procedimientosMes: { procedimiento: string; total: number }[];
  };
}

export interface ConsultaApi {
  cita: CitaApi;
  antecedentes: Pick<AntecedenteApi, 'id' | 'tipo' | 'descripcion'>[];
  signosVitales: SignosApi | null;
  alertas: AlertaApi[];
  historial: DiagnosticoApi[];
  odontograma: { anterior: OdontogramaApi; actual: OdontogramaApi };
  recetas: RecetaApi[];
  consentimientos: ConsentimientoApi[];
}

export interface RecordatoriosApi {
  fecha: string;
  pendientes: number;
  citas: (CitaApi & { recordatorio: RecordatorioApi | null })[];
}
