// ==================== CAPA DE DATOS DE LA CLÍNICA ====================
// Único archivo que lee y escribe los datos de la app.
//
// Hoy guarda todo en localStorage. Cuando exista el backend, estas funciones
// pasarán a llamar a la API y el resto de la app no tendrá que cambiar.
//
// Flujo de una cita:
//   Pendiente → Confirmada (pasa a enfermería) → En consulta (signos listos,
//   pasa a odontología) → Atendida (consulta finalizada)
//   También puede quedar como "No asistió".

import { evaluarSignosVitales } from '../utils/signosVitales';

const SYNC_KEY = 'clinicaDentalSync';
export const EVENTO_ACTUALIZACION = 'syncUpdate';

export const ESTADOS_CITA = Object.freeze({
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  EN_CONSULTA: 'En consulta',
  ATENDIDA: 'Atendida',
  NO_ASISTIO: 'No asistió',
});

const estructuraInicial = Object.freeze({
  pacientes: [],              // Pacientes registrados (uno por cédula)
  citasDelDia: [],            // Todas las citas (el nombre se mantiene por compatibilidad)
  pacientesEnEspera: [],      // Cola de enfermería
  pacientesPreparados: [],    // Con signos vitales, esperando a la odontóloga
  historialAtenciones: [],    // Atenciones de enfermería
  alertasMedicas: [],         // Alergias y signos vitales fuera de lo normal
  recetas: [],                // Recetas emitidas (se pueden volver a descargar)
  historialOdontologico: [],  // Diagnósticos y procedimientos
  odontogramas: {},           // Estado de los dientes por cédula del paciente
});

const crearEstructuraInicial = () => structuredClone(estructuraInicial);

// ==================== UTILIDADES ====================

// IDs únicos. crypto.randomUUID solo existe en contextos seguros (https o localhost).
export const generarId = (prefijo) => {
  const unico = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefijo}_${unico}`;
};

// Fecha local en formato YYYY-MM-DD (toISOString usa UTC y en Ecuador
// cambia de día a las 19:00).
export const fechaLocalISO = (fecha = new Date()) => {
  const d = new Date(fecha);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

const ahora = () => new Date().toISOString();
const esAlergia = (texto = '') => /alerg/i.test(texto);

/** Completa alertas guardadas por versiones anteriores (solo tenían alergias) */
export const normalizarAlerta = (a) => ({
  ...a,
  tipo: a.tipo || 'alergia',
  titulo: a.titulo || 'Alergia',
  severidad: a.severidad || 'alta',
});

const ORDEN_SEVERIDAD = { critica: 0, alta: 1, moderada: 2 };
export const ordenarAlertas = (alertas) =>
  alertas.map(normalizarAlerta).sort((a, b) => ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad]);

/** Alertas de una visita: las de sus signos vitales y las alergias conocidas del paciente */
export const alertasDeVisita = (datos, citaId, cedula, nombre) => ordenarAlertas(
  datos.alertasMedicas.filter((a) => a.citaId === citaId
    || ((a.tipo || 'alergia') === 'alergia' && (a.cedula === cedula || (!a.cedula && a.paciente === nombre)))),
);

// ==================== LECTURA Y ESCRITURA ====================

export const obtenerDatosSync = () => {
  try {
    const guardado = localStorage.getItem(SYNC_KEY);
    // Se mezcla con la estructura inicial para que datos antiguos
    // sin alguna lista nueva (p. ej. odontogramas) sigan funcionando.
    return guardado
      ? { ...crearEstructuraInicial(), ...JSON.parse(guardado) }
      : crearEstructuraInicial();
  } catch (error) {
    console.error('Error al leer los datos de la clínica:', error);
    return crearEstructuraInicial();
  }
};

export const guardarDatosSync = (datos) => {
  try {
    const actualizados = { ...datos, ultimaActualizacion: ahora() };
    localStorage.setItem(SYNC_KEY, JSON.stringify(actualizados));
    // Avisa a los componentes de esta pestaña (las otras pestañas
    // se enteran por el evento 'storage' del navegador).
    window.dispatchEvent(new CustomEvent(EVENTO_ACTUALIZACION, { detail: actualizados }));
    return true;
  } catch (error) {
    console.error('Error al guardar los datos de la clínica:', error);
    return false;
  }
};

const modificar = (cambio) => {
  const datos = obtenerDatosSync();
  const resultado = cambio(datos);
  if (resultado === false) return false;
  return guardarDatosSync(datos);
};

// ==================== PACIENTES ====================

// Crea o actualiza un paciente usando la cédula como clave
const guardarPaciente = (datos, info) => {
  const existente = datos.pacientes.find((p) => p.cedula === info.cedula);
  const campos = {
    cedula: info.cedula,
    nombre: info.nombre,
    sexo: info.sexo,
    edad: info.edad,
    telefono: info.telefono,
    correo: info.correo,
  };
  if (existente) {
    Object.assign(existente, campos, { ultimaModificacion: ahora() });
    return existente;
  }
  const nuevo = { id: generarId('paciente'), ...campos, fechaRegistro: ahora() };
  datos.pacientes.push(nuevo);
  return nuevo;
};

/**
 * Lista de pacientes: los registrados más los que solo aparecen en citas.
 * Incluye el número de citas y la fecha de la última.
 */
export const obtenerListaPacientes = (datos = obtenerDatosSync()) => {
  const porCedula = new Map();

  datos.pacientes.forEach((p) => porCedula.set(p.cedula, { ...p, citas: 0, ultimaCita: null }));

  datos.citasDelDia.forEach((c) => {
    if (!porCedula.has(c.cedula)) {
      porCedula.set(c.cedula, {
        id: `cita-${c.cedula}`,
        cedula: c.cedula,
        nombre: c.paciente,
        sexo: c.sexo,
        edad: c.edad,
        telefono: c.telefono,
        correo: c.email,
        citas: 0,
        ultimaCita: null,
      });
    }
    const p = porCedula.get(c.cedula);
    p.citas += 1;
    if (!p.ultimaCita || c.fecha > p.ultimaCita) p.ultimaCita = c.fecha;
  });

  return [...porCedula.values()].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
};

export const registrarNuevoPaciente = (paciente) =>
  modificar((datos) => {
    const p = guardarPaciente(datos, paciente);

    // Registro rápido = paciente que llega sin cita: se crea una cita
    // confirmada para ahora y pasa directo a enfermería.
    const cita = crearCita({
      cedula: p.cedula,
      paciente: p.nombre,
      fecha: fechaLocalISO(),
      hora: new Date().toTimeString().slice(0, 5),
      consulta: 'Revisión',
      sexo: p.sexo,
      edad: p.edad,
      telefono: p.telefono,
      email: p.correo,
      estado: ESTADOS_CITA.CONFIRMADA,
    });
    datos.citasDelDia.push(cita);
    enviarPacienteAEnfermeria(cita, datos);
  });

// ==================== CITAS (RECEPCIÓN) ====================

const crearCita = (cita) => ({
  id: generarId('cita'),
  cedula: cita.cedula,
  paciente: cita.paciente,
  fecha: cita.fecha,
  hora: cita.hora,
  consulta: cita.consulta,
  sexo: cita.sexo,
  edad: cita.edad,
  telefono: cita.telefono,
  email: cita.email,
  estado: cita.estado || ESTADOS_CITA.PENDIENTE,
  fechaRegistro: ahora(),
  enEnfermeria: false,
  preparado: false,
  enOdontologia: false,
});

export const registrarNuevaCita = (cita) =>
  modificar((datos) => {
    guardarPaciente(datos, {
      cedula: cita.cedula,
      nombre: cita.paciente,
      sexo: cita.sexo,
      edad: cita.edad,
      telefono: cita.telefono,
      correo: cita.email,
    });
    const nueva = crearCita(cita);
    datos.citasDelDia.push(nueva);
    // Solo las citas confirmadas pasan a la sala de espera de enfermería
    if (nueva.estado === ESTADOS_CITA.CONFIRMADA) {
      enviarPacienteAEnfermeria(nueva, datos);
    }
  });

export const actualizarCita = (id, cambios) =>
  modificar((datos) => {
    const cita = datos.citasDelDia.find((c) => c.id === id);
    if (!cita) return false;
    const yaEstabaEnEnfermeria = cita.enEnfermeria;
    Object.assign(cita, cambios, { ultimaModificacion: ahora() });

    if (cita.estado === ESTADOS_CITA.CONFIRMADA && !yaEstabaEnEnfermeria) {
      enviarPacienteAEnfermeria(cita, datos);
    }
    // Mantener sincronizados los datos que ve enfermería
    datos.pacientesEnEspera
      .filter((p) => p.id === id)
      .forEach((p) => Object.assign(p, {
        paciente: cita.paciente, hora: cita.hora, edad: cita.edad,
        sexo: cita.sexo, consulta: cita.consulta,
      }));
  });

export const confirmarCita = (id) => actualizarCita(id, { estado: ESTADOS_CITA.CONFIRMADA });

export const marcarNoAsistio = (id) =>
  modificar((datos) => {
    const cita = datos.citasDelDia.find((c) => c.id === id);
    if (!cita) return false;
    cita.estado = ESTADOS_CITA.NO_ASISTIO;
    cita.ultimaModificacion = ahora();
    datos.pacientesEnEspera = datos.pacientesEnEspera.filter((p) => p.id !== id);
  });

export const eliminarCita = (id) =>
  modificar((datos) => {
    const antes = datos.citasDelDia.length;
    datos.citasDelDia = datos.citasDelDia.filter((c) => c.id !== id);
    if (datos.citasDelDia.length === antes) return false;
    datos.pacientesEnEspera = datos.pacientesEnEspera.filter((p) => p.id !== id);
    datos.pacientesPreparados = datos.pacientesPreparados.filter((p) => p.id !== id);
  });

// ==================== ENFERMERÍA ====================

const enviarPacienteAEnfermeria = (cita, datos) => {
  const yaEnEspera = datos.pacientesEnEspera.some((p) => p.id === cita.id);
  if (!yaEnEspera) {
    datos.pacientesEnEspera.push({
      id: cita.id,
      cedula: cita.cedula,
      paciente: cita.paciente,
      hora: cita.hora,
      edad: cita.edad,
      sexo: cita.sexo,
      telefono: cita.telefono,
      email: cita.email,
      consulta: cita.consulta,
      estado: 'En espera',
      fechaLlegada: ahora(),
    });
  }
  const original = datos.citasDelDia.find((c) => c.id === cita.id);
  if (original) original.enEnfermeria = true;
};

/**
 * Guarda los signos vitales y pasa al paciente a odontología.
 * medicion = { presion: '120/80', pulso: '72', temperatura: '36.5', observaciones }
 * Los valores fuera de lo normal para la edad del paciente generan alertas médicas.
 */
export const registrarSignosVitales = (paciente, medicion) =>
  modificar((datos) => {
    const hallazgos = evaluarSignosVitales({
      presion: medicion.presion,
      pulso: medicion.pulso,
      temperatura: medicion.temperatura,
      edad: paciente.edad,
      sexo: paciente.sexo,
    });
    const observaciones = medicion.observaciones?.trim() || 'Ninguna';
    const signosVitales = {
      presion: medicion.presion,
      pulso: `${medicion.pulso} lpm`,
      temperatura: `${String(medicion.temperatura).replace(',', '.')}°C`,
      observaciones,
      hallazgos,
    };
    const fecha = ahora();

    const preparado = {
      id: paciente.id,
      cedula: paciente.cedula,
      paciente: paciente.paciente,
      hora: paciente.hora,
      edad: paciente.edad,
      sexo: paciente.sexo,
      consulta: paciente.consulta,
      estado: 'Preparado',
      signosVitales,
      fechaLlegada: paciente.fechaLlegada,
      fechaPreparacion: fecha,
    };

    datos.pacientesEnEspera = datos.pacientesEnEspera.filter((p) => p.id !== paciente.id);
    datos.pacientesPreparados.push(preparado);

    datos.historialAtenciones.push({
      id: generarId('atencion'),
      cedula: paciente.cedula,
      paciente: paciente.paciente,
      fecha,
      tratamiento: paciente.consulta || '--',
      signosVitales,
      observaciones,
      // Minutos entre la llegada a la sala de espera y la toma de signos
      minutosEspera: paciente.fechaLlegada
        ? Math.max(0, Math.round((Date.now() - new Date(paciente.fechaLlegada)) / 60000))
        : null,
    });

    const base = { cedula: paciente.cedula, citaId: paciente.id, paciente: paciente.paciente, fecha };
    hallazgos.forEach((h) => datos.alertasMedicas.push({
      id: generarId('alerta'),
      ...base,
      tipo: 'signos',
      signo: h.signo,
      severidad: h.severidad,
      titulo: h.titulo,
      descripcion: h.descripcion,
    }));
    if (esAlergia(observaciones)) {
      datos.alertasMedicas.push({
        id: generarId('alerta'),
        ...base,
        tipo: 'alergia',
        severidad: 'alta',
        titulo: 'Alergia',
        descripcion: observaciones,
      });
    }

    const cita = datos.citasDelDia.find((c) => c.id === paciente.id);
    if (cita) {
      Object.assign(cita, {
        preparado: true,
        enOdontologia: true,
        signosVitales,
        estado: ESTADOS_CITA.EN_CONSULTA,
      });
    }
  });

// ==================== ODONTOLOGÍA ====================

/** Pacientes que ya pasaron por enfermería y esperan a la odontóloga */
export const obtenerPacientesOdontologia = (datos = obtenerDatosSync()) =>
  datos.pacientesPreparados.map((p) => ({
    id: p.id,
    cedula: p.cedula,
    nombre: p.paciente,
    edad: p.edad,
    sexo: p.sexo,
    hora: p.hora,
    tratamiento: p.consulta,
    alergias: esAlergia(p.signosVitales?.observaciones) ? p.signosVitales.observaciones : 'Ninguna',
    signosVitales: p.signosVitales,
    alertas: alertasDeVisita(datos, p.id, p.cedula, p.paciente),
    fechaPreparacion: p.fechaPreparacion,
  }));

export const registrarDiagnostico = (paciente, diagnostico) =>
  modificar((datos) => {
    const nuevo = {
      id: generarId('diagnostico'),
      pacienteId: paciente.id,
      cedula: paciente.cedula,
      paciente: paciente.nombre,
      diente: diagnostico.diente,
      procedimiento: diagnostico.procedimiento,
      diagnostico: diagnostico.diagnostico,
      notas: diagnostico.notas,
      estado: 'proceso',
      fechaRegistro: ahora(),
    };
    datos.historialOdontologico.push(nuevo);
    const cita = datos.citasDelDia.find((c) => c.id === paciente.id);
    if (cita) cita.diagnostico = nuevo;
  });

/** Guarda una receta emitida para poder volver a descargarla después */
export const registrarReceta = (paciente, receta) => {
  const fecha = new Date();
  const hora = `${String(fecha.getHours()).padStart(2, '0')}${String(fecha.getMinutes()).padStart(2, '0')}${String(fecha.getSeconds()).padStart(2, '0')}`;
  const nueva = {
    id: generarId('receta'),
    numero: `RX-${fechaLocalISO(fecha).replace(/-/g, '')}-${hora}`,
    citaId: paciente.id,
    cedula: paciente.cedula,
    paciente: paciente.nombre,
    medicamento: receta.medicamento,
    dosis: receta.dosis,
    frecuencia: receta.frecuencia,
    duracion: receta.duracion,
    indicaciones: receta.indicaciones,
    fechaRegistro: fecha.toISOString(),
  };
  const ok = modificar((datos) => {
    datos.recetas = [...(datos.recetas || []), nueva];
  });
  return ok ? nueva : null;
};

/** Cierra la consulta: el paciente sale de la agenda y la cita queda atendida */
export const finalizarConsulta = (paciente) =>
  modificar((datos) => {
    datos.pacientesPreparados = datos.pacientesPreparados.filter((p) => p.id !== paciente.id);
    datos.historialOdontologico
      .filter((h) => h.pacienteId === paciente.id && h.estado === 'proceso')
      .forEach((h) => { h.estado = 'completado'; });
    const cita = datos.citasDelDia.find((c) => c.id === paciente.id);
    if (cita) {
      cita.estado = ESTADOS_CITA.ATENDIDA;
      cita.fechaAtencion = ahora();
    }
  });

/** Historial odontológico de un paciente (por cédula, incluye visitas anteriores) */
export const obtenerHistorialOdontologico = (cedula, datos = obtenerDatosSync()) => {
  if (!cedula) return datos.historialOdontologico;
  const idsCitas = new Set(datos.citasDelDia.filter((c) => c.cedula === cedula).map((c) => c.id));
  return datos.historialOdontologico.filter((h) => h.cedula === cedula || idsCitas.has(h.pacienteId));
};

export const obtenerOdontograma = (cedula, datos = obtenerDatosSync()) =>
  datos.odontogramas?.[cedula] || {};

export const guardarOdontograma = (cedula, estados) =>
  modificar((datos) => {
    datos.odontogramas = { ...datos.odontogramas, [cedula]: estados };
  });

// ==================== FICHA DEL PACIENTE ====================

/**
 * Todo lo que se sabe de un paciente, en una línea de tiempo
 * ordenada del evento más reciente al más antiguo.
 */
export const obtenerFichaPaciente = (cedula, datos = obtenerDatosSync()) => {
  const paciente = obtenerListaPacientes(datos).find((p) => p.cedula === cedula);
  if (!paciente) return null;

  const citas = datos.citasDelDia.filter((c) => c.cedula === cedula);
  const idsCitas = new Set(citas.map((c) => c.id));
  const nombre = paciente.nombre;
  const delPaciente = (r) => r.cedula === cedula || (!r.cedula && r.paciente === nombre);

  const eventos = [
    ...citas.map((c) => ({
      id: `e-${c.id}`,
      tipo: 'cita',
      fecha: c.fecha && c.hora ? `${c.fecha}T${c.hora}` : c.fechaRegistro,
      titulo: `Cita: ${c.consulta}`,
      detalle: `Estado: ${c.estado}`,
      estado: c.estado,
    })),
    ...datos.historialAtenciones.filter(delPaciente).map((a) => ({
      id: `e-${a.id}`,
      tipo: 'signos',
      fecha: a.fecha,
      titulo: 'Signos vitales',
      detalle: a.signosVitales
        ? `Presión ${a.signosVitales.presion} · Pulso ${a.signosVitales.pulso} · Temp. ${a.signosVitales.temperatura}`
        : a.observaciones,
      notas: a.signosVitales ? a.observaciones : null,
    })),
    ...datos.historialOdontologico
      .filter((h) => h.cedula === cedula || idsCitas.has(h.pacienteId))
      .map((h) => ({
        id: `e-${h.id}`,
        tipo: 'diagnostico',
        fecha: h.fechaRegistro,
        titulo: `${h.procedimiento} · pieza ${h.diente}`,
        detalle: h.diagnostico,
        notas: h.notas,
      })),
    ...datos.alertasMedicas.filter(delPaciente).map(normalizarAlerta).map((a) => ({
      id: `e-${a.id}`,
      tipo: 'alerta',
      fecha: a.fecha,
      titulo: `Alerta: ${a.titulo}`,
      detalle: a.descripcion,
      severidad: a.severidad,
    })),
    ...(datos.recetas || []).filter((r) => r.cedula === cedula).map((r) => ({
      id: `e-${r.id}`,
      tipo: 'receta',
      fecha: r.fechaRegistro,
      titulo: `Receta: ${r.medicamento}`,
      detalle: `${r.dosis} · ${r.frecuencia} · ${r.duracion}`,
    })),
  ].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

  return {
    paciente,
    citas,
    eventos,
    alertas: ordenarAlertas(datos.alertasMedicas.filter(delPaciente)),
    recetas: (datos.recetas || []).filter((r) => r.cedula === cedula).reverse(),
    historial: obtenerHistorialOdontologico(cedula, datos),
    ultimosSignos: [...datos.historialAtenciones].reverse().find(delPaciente)?.signosVitales || null,
    odontograma: obtenerOdontograma(cedula, datos),
  };
};

// ==================== MANTENIMIENTO ====================

/** Migra datos de la primera versión (tres localStorage separados). Se ejecuta una vez. */
export const migrarDatosExistentes = () => {
  if (localStorage.getItem('migracionRealizada')) return;
  try {
    const datos = obtenerDatosSync();
    const leer = (clave) => JSON.parse(localStorage.getItem(clave) || 'null');

    const recepcion = leer('recepcionistaData');
    if (recepcion?.pacientes) datos.pacientes.push(...recepcion.pacientes);
    if (recepcion?.citas) {
      recepcion.citas.forEach((c) => {
        const cita = { ...crearCita(c), id: c.id || generarId('cita') };
        datos.citasDelDia.push(cita);
        if (cita.estado === ESTADOS_CITA.CONFIRMADA) enviarPacienteAEnfermeria(cita, datos);
      });
    }

    const enfermeria = leer('enfermeraData');
    if (enfermeria?.pacientesEspera) datos.pacientesEnEspera.push(...enfermeria.pacientesEspera);
    if (enfermeria?.pacientesPreparados) datos.pacientesPreparados.push(...enfermeria.pacientesPreparados);
    if (enfermeria?.historialAtenciones) datos.historialAtenciones.push(...enfermeria.historialAtenciones);
    if (enfermeria?.alertasMedicas) datos.alertasMedicas.push(...enfermeria.alertasMedicas);

    const odontologia = leer('odontologaData');
    if (odontologia?.historialClinico) datos.historialOdontologico.push(...odontologia.historialClinico);

    guardarDatosSync(datos);
  } catch (error) {
    console.error('Error en la migración de datos:', error);
  } finally {
    localStorage.setItem('migracionRealizada', 'true');
  }
};

export const limpiarDatosSync = () => {
  localStorage.removeItem(SYNC_KEY);
  window.dispatchEvent(new CustomEvent(EVENTO_ACTUALIZACION));
};
