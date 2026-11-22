// ==================== DATOS QUE USAN LAS PANTALLAS ====================
// Los servicios (src/services) convierten las respuestas de la API (api.ts)
// a estas formas: estados con texto legible, campos planos para las tablas, etc.

import type {
  AntecedenteApi, Cara, ConsentimientoApi, FechaISO, Medicamento, PacienteApi, RecordatorioApi, UsuarioApi,
} from './api';
import type { ESTADOS_CITA } from '../services/clinica';
import type { ROLES } from '../services/authService';

export type Rol = (typeof ROLES)[keyof typeof ROLES];
export type EstadoCita = (typeof ESTADOS_CITA)[keyof typeof ESTADOS_CITA];
export type Sexo = 'Femenino' | 'Masculino' | 'Otro';
export type Severidad = 'critica' | 'alta' | 'moderada';
export type TipoAlerta = 'signos' | 'alergia' | 'antecedente';
export type EstadoProcedimiento = 'pendiente' | 'proceso' | 'completado';
export type EstadoPieza = 'sano' | 'caries' | 'tratado' | 'observacion' | 'ausente';

/** Errores de un formulario: { campo: mensaje } */
export type Errores = Record<string, string>;

export type Usuario = Omit<UsuarioApi, 'rol'> & { rol: Rol };

export type Paciente = Omit<PacienteApi, 'sexo'> & { sexo: Sexo | string };

/** Paciente en el listado: con número de citas y fecha de la última */
export type PacienteListado = Paciente & { citas: number; ultimaCita: string | null };

/** Valores del formulario de paciente (todo como texto) */
export interface FormularioPaciente {
  cedula: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  sexo: string;
  telefono: string;
  correo: string;
  contactoEmergenciaNombre: string;
  contactoEmergenciaTelefono: string;
}

/** Formulario de cita: datos del paciente más fecha, hora y tipo de consulta */
export interface FormularioCita extends FormularioPaciente {
  fecha: string;
  hora: string;
  consulta: string;
  estado?: string;
}

export interface Cita {
  id: string;
  fecha: string;
  hora: string;
  /** Tipo de consulta o procedimiento */
  consulta: string;
  estado: EstadoCita;
  motivoAnulacion: string | null;
  llegadaEn: FechaISO | null;
  // Campos planos para tablas y métricas
  paciente: string | undefined;
  cedula: string | undefined;
  telefono: string | undefined;
  email: string | null | undefined;
  edad: number | undefined;
  datosPaciente: Paciente | undefined;
}

export interface Alerta {
  id: string;
  citaId: string | null;
  tipo: TipoAlerta | string;
  signo: string | null;
  severidad: Severidad;
  titulo: string;
  descripcion: string;
  fecha: FechaISO;
  paciente?: string;
}

/** Signos vitales como texto para mostrar ("120/80", "72 lpm") */
export interface Signos {
  presion: string;
  pulso: string;
  temperatura: string;
  frecuenciaRespiratoria: string | null;
  saturacion: string | null;
  observaciones: string;
  registradoPor?: string;
  fecha?: FechaISO;
  hallazgos?: Alerta[];
}

export interface Diagnostico {
  id: string;
  citaId: string | undefined;
  piezas: number[];
  /** Piezas separadas por coma ("16, 26") */
  diente: string;
  procedimiento: string;
  diagnostico: string;
  notas: string | null;
  estado: EstadoProcedimiento | string;
  fechaRegistro: FechaISO;
  odontologo: string | undefined;
}

/** Receta con los datos del primer medicamento a mano (para listas cortas) */
export interface Receta extends Partial<Medicamento> {
  id: string;
  numero: string;
  citaId: string;
  medicamentos: Medicamento[];
  indicaciones: string | null;
  odontologo: string | undefined;
  fechaRegistro: FechaISO;
}

export type Consentimiento = ConsentimientoApi;
export type Antecedente = AntecedenteApi;

/** Odontograma en pantalla: { 16: { completa: 'caries', caras: { OCLUSAL: 'tratado' } } } */
export interface MarcaPieza {
  completa: EstadoPieza | null;
  caras: Partial<Record<Cara, EstadoPieza>>;
}
export type Odontograma = Record<string, MarcaPieza>;

export type CitaConRecordatorio = Cita & { recordatorio: RecordatorioApi | null };

/** Elemento de la línea de tiempo de la ficha */
export interface EventoFicha {
  id: string;
  tipo: 'cita' | 'signos' | 'diagnostico' | 'alerta' | 'receta' | 'consentimiento';
  fecha: string;
  titulo: string;
  detalle: string;
  notas?: string | null;
}

/** Barra de un gráfico simple */
export interface Barra {
  label: string;
  value: number;
  highlight?: boolean;
}
