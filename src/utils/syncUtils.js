// ==================== SISTEMA DE SINCRONIZACIÓN CENTRALIZADO ====================
// Este archivo maneja la sincronización de datos entre los 3 dashboards

// ===== CLAVE PRINCIPAL DE LOCALSTORAGE =====
const SYNC_KEY = 'clinicaDentalSync';

// ==================== ESTRUCTURA DE DATOS CENTRALIZADA ====================
const estructuraInicial = {
  pacientes: [],           // Todos los pacientes registrados
  citasDelDia: [],        // Citas agendadas para hoy
  pacientesEnEspera: [],  // Pacientes esperando en enfermería
  pacientesPreparados: [], // Pacientes con signos vitales listos para odontóloga
  historialAtenciones: [], // Historial de atenciones de enfermería
  alertasMedicas: [],     // Alertas médicas activas
  historialOdontologico: [], // Historial de tratamientos odontológicos
  ultimaActualizacion: new Date().toISOString()
};

// ==================== OBTENER DATOS SINCRONIZADOS ====================
export const obtenerDatosSync = () => {
  try {
    const datos = localStorage.getItem(SYNC_KEY);
    if (datos) {
      return JSON.parse(datos);
    }
    return estructuraInicial;
  } catch (error) {
    console.error('Error al obtener datos sincronizados:', error);
    return estructuraInicial;
  }
};

// ==================== GUARDAR DATOS SINCRONIZADOS ====================
export const guardarDatosSync = (datos) => {
  try {
    const datosActualizados = {
      ...datos,
      ultimaActualizacion: new Date().toISOString()
    };
    localStorage.setItem(SYNC_KEY, JSON.stringify(datosActualizados));
    
    // Disparar evento personalizado para que otros componentes se actualicen
    window.dispatchEvent(new CustomEvent('syncUpdate', { detail: datosActualizados }));
    
    return true;
  } catch (error) {
    console.error('Error al guardar datos sincronizados:', error);
    return false;
  }
};

// ==================== FUNCIONES DE RECEPCIONISTA ====================

/**
 * Registra una nueva cita y la envía automáticamente a enfermería
 */
export const registrarNuevaCita = (cita) => {
  const datos = obtenerDatosSync();
  
  // Crear objeto de cita completo
  const nuevaCita = {
    id: `cita_${Date.now()}`,
    cedula: cita.cedula,
    paciente: cita.paciente,
    fecha: cita.fecha,
    hora: cita.hora,
    consulta: cita.consulta,
    sexo: cita.sexo,
    edad: cita.edad,
    telefono: cita.telefono,
    email: cita.email,
    estado: cita.estado || 'Pendiente',
    fechaRegistro: new Date().toISOString(),
    // Datos para el flujo
    enEnfermeria: false,
    preparado: false,
    enOdontologia: false
  };
  
  // Agregar a citas del día
  datos.citasDelDia.push(nuevaCita);
  
  // Si la cita es para hoy, enviar automáticamente a enfermería
  const fechaHoy = new Date().toISOString().split('T')[0];
  const fechaCita = nuevaCita.fecha;
  
  if (fechaCita === fechaHoy || nuevaCita.estado === 'Confirmada') {
    enviarPacienteAEnfermeria(nuevaCita, datos);
  }
  
  return guardarDatosSync(datos);
};

/**
 * Registra un nuevo paciente (registro rápido)
 */
export const registrarNuevoPaciente = (paciente) => {
  const datos = obtenerDatosSync();
  
  const nuevoPaciente = {
    id: `paciente_${Date.now()}`,
    cedula: paciente.cedula,
    nombre: paciente.nombre,
    sexo: paciente.sexo,
    edad: paciente.edad,
    telefono: paciente.telefono,
    correo: paciente.correo,
    fechaRegistro: new Date().toISOString()
  };
  
  datos.pacientes.push(nuevoPaciente);
  
  // Crear cita automática para hoy y enviar a enfermería
  const citaAutomatica = {
    id: `cita_${Date.now()}`,
    cedula: nuevoPaciente.cedula,
    paciente: nuevoPaciente.nombre,
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
    consulta: 'Revisión',
    sexo: nuevoPaciente.sexo,
    edad: nuevoPaciente.edad,
    telefono: nuevoPaciente.telefono,
    email: nuevoPaciente.correo,
    estado: 'Confirmada',
    fechaRegistro: new Date().toISOString(),
    enEnfermeria: false,
    preparado: false,
    enOdontologia: false
  };
  
  datos.citasDelDia.push(citaAutomatica);
  enviarPacienteAEnfermeria(citaAutomatica, datos);
  
  return guardarDatosSync(datos);
};

/**
 * Actualiza una cita existente
 */
export const actualizarCita = (indice, citaActualizada) => {
  const datos = obtenerDatosSync();
  
  if (datos.citasDelDia[indice]) {
    const citaAnterior = datos.citasDelDia[indice];
    
    datos.citasDelDia[indice] = {
      ...datos.citasDelDia[indice],
      ...citaActualizada,
      ultimaModificacion: new Date().toISOString()
    };
    
    // Si la cita cambió a "Confirmada" y no estaba en enfermería, enviarla
    if (citaActualizada.estado === 'Confirmada' && !citaAnterior.enEnfermeria) {
      enviarPacienteAEnfermeria(datos.citasDelDia[indice], datos);
    }
    
    return guardarDatosSync(datos);
  }
  
  return false;
};

/**
 * Elimina una cita
 */
export const eliminarCita = (indice) => {
  const datos = obtenerDatosSync();
  const citaEliminada = datos.citasDelDia[indice];
  
  // Remover de citas del día
  datos.citasDelDia.splice(indice, 1);
  
  // Si está en enfermería, remover de ahí también
  if (citaEliminada) {
    datos.pacientesEnEspera = datos.pacientesEnEspera.filter(
      p => p.cedula !== citaEliminada.cedula
    );
  }
  
  return guardarDatosSync(datos);
};

// ==================== FUNCIONES DE ENFERMERÍA ====================

/**
 * Envía un paciente a la sala de espera de enfermería
 */
const enviarPacienteAEnfermeria = (cita, datos) => {
  const pacienteEspera = {
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
    fechaLlegada: new Date().toISOString()
  };
  
  // Verificar que no esté duplicado
  const existe = datos.pacientesEnEspera.find(p => p.cedula === cita.cedula);
  if (!existe) {
    datos.pacientesEnEspera.push(pacienteEspera);
  }
  
  // Marcar en la cita que ya está en enfermería
  const citaIndex = datos.citasDelDia.findIndex(c => c.id === cita.id);
  if (citaIndex !== -1) {
    datos.citasDelDia[citaIndex].enEnfermeria = true;
  }
};

/**
 * Registra los signos vitales y marca al paciente como preparado
 */
export const registrarSignosVitales = (paciente, signosVitales) => {
  const datos = obtenerDatosSync();
  
  // Crear paciente preparado con signos vitales
  const pacientePreparado = {
    id: paciente.id,
    cedula: paciente.cedula,
    paciente: paciente.paciente,
    hora: paciente.hora,
    edad: paciente.edad,
    sexo: paciente.sexo,
    consulta: paciente.consulta,
    estado: 'Preparado',
    signosVitales: {
      presion: signosVitales.presion,
      pulso: signosVitales.pulso,
      temperatura: signosVitales.temperatura,
      observaciones: signosVitales.observaciones
    },
    fechaPreparacion: new Date().toISOString()
  };
  
  // Remover de lista de espera
  datos.pacientesEnEspera = datos.pacientesEnEspera.filter(
    p => p.id !== paciente.id
  );
  
  // Agregar a preparados
  datos.pacientesPreparados.push(pacientePreparado);
  
  // Agregar al historial de atenciones
  const fecha = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  datos.historialAtenciones.push({
    id: `atencion_${Date.now()}`,
    paciente: paciente.paciente,
    fecha: fecha,
    tratamiento: '--',
    observaciones: signosVitales.observaciones || 'Ninguna'
  });
  
  // Detectar alertas médicas (alergias, valores anormales)
  if (/alerg/i.test(signosVitales.observaciones)) {
    datos.alertasMedicas.push({
      id: `alerta_${Date.now()}`,
      paciente: paciente.paciente,
      descripcion: signosVitales.observaciones,
      tipo: 'alergia',
      fecha: new Date().toISOString()
    });
  }
  
  // Actualizar estado en la cita
  const citaIndex = datos.citasDelDia.findIndex(c => c.cedula === paciente.cedula);
  if (citaIndex !== -1) {
    datos.citasDelDia[citaIndex].preparado = true;
    datos.citasDelDia[citaIndex].signosVitales = pacientePreparado.signosVitales;
  }
  
  // Enviar automáticamente a odontología
  enviarPacienteAOdontologia(pacientePreparado, datos);
  
  return guardarDatosSync(datos);
};

// ==================== FUNCIONES DE ODONTOLOGÍA ====================

/**
 * Envía un paciente preparado a la agenda de la odontóloga
 */
const enviarPacienteAOdontologia = (pacientePreparado, datos) => {
  const pacienteOdontologia = {
    id: pacientePreparado.id,
    cedula: pacientePreparado.cedula,
    nombre: pacientePreparado.paciente,
    edad: pacientePreparado.edad,
    sexo: pacientePreparado.sexo,
    tratamiento: pacientePreparado.consulta,
    ultimaVisita: new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }),
    alergias: pacientePreparado.signosVitales?.observaciones?.match(/alerg/i) 
      ? pacientePreparado.signosVitales.observaciones 
      : 'Ninguna',
    signosVitales: pacientePreparado.signosVitales,
    estado: 'Listo para consulta',
    fechaIngreso: new Date().toISOString()
  };
  
  // Actualizar estado en la cita
  const citaIndex = datos.citasDelDia.findIndex(c => c.cedula === pacientePreparado.cedula);
  if (citaIndex !== -1) {
    datos.citasDelDia[citaIndex].enOdontologia = true;
    datos.citasDelDia[citaIndex].estado = 'En consulta';
  }
};

/**
 * Obtiene los pacientes listos para la odontóloga
 */
export const obtenerPacientesOdontologia = () => {
  const datos = obtenerDatosSync();
  
  // Convertir pacientes preparados a formato de odontología
  return datos.pacientesPreparados.map(p => ({
    id: p.id,
    cedula: p.cedula,
    nombre: p.paciente,
    edad: p.edad,
    sexo: p.sexo,
    tratamiento: p.consulta,
    ultimaVisita: new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }),
    alergias: p.signosVitales?.observaciones?.match(/alerg/i) 
      ? p.signosVitales.observaciones 
      : 'Ninguna',
    signosVitales: p.signosVitales
  }));
};

/**
 * Registra un diagnóstico odontológico
 */
export const registrarDiagnostico = (paciente, diagnostico) => {
  const datos = obtenerDatosSync();
  
  const nuevoDiagnostico = {
    id: `diagnostico_${Date.now()}`,
    pacienteId: paciente.id,
    paciente: paciente.nombre,
    diente: diagnostico.diente,
    procedimiento: diagnostico.procedimiento,
    diagnostico: diagnostico.diagnostico,
    notas: diagnostico.notas,
    fecha: new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }),
    estado: 'proceso',
    fechaRegistro: new Date().toISOString()
  };
  
  datos.historialOdontologico.push(nuevoDiagnostico);
  
  // Actualizar estado de la cita
  const citaIndex = datos.citasDelDia.findIndex(c => c.cedula === paciente.cedula);
  if (citaIndex !== -1) {
    datos.citasDelDia[citaIndex].estado = 'Atendida';
    datos.citasDelDia[citaIndex].diagnostico = nuevoDiagnostico;
  }
  
  return guardarDatosSync(datos);
};

// ==================== FUNCIONES DE CONSULTA ====================

/**
 * Obtiene todas las citas del día
 */
export const obtenerCitasDelDia = () => {
  const datos = obtenerDatosSync();
  return datos.citasDelDia || [];
};

/**
 * Obtiene todos los pacientes registrados
 */
export const obtenerPacientes = () => {
  const datos = obtenerDatosSync();
  return datos.pacientes || [];
};

/**
 * Obtiene pacientes en espera para enfermería
 */
export const obtenerPacientesEnEspera = () => {
  const datos = obtenerDatosSync();
  return datos.pacientesEnEspera || [];
};

/**
 * Obtiene pacientes preparados
 */
export const obtenerPacientesPreparados = () => {
  const datos = obtenerDatosSync();
  return datos.pacientesPreparados || [];
};

/**
 * Obtiene el historial de atenciones de enfermería
 */
export const obtenerHistorialAtenciones = () => {
  const datos = obtenerDatosSync();
  return datos.historialAtenciones || [];
};

/**
 * Obtiene las alertas médicas activas
 */
export const obtenerAlertasMedicas = () => {
  const datos = obtenerDatosSync();
  return datos.alertasMedicas || [];
};

/**
 * Obtiene el historial odontológico
 */
export const obtenerHistorialOdontologico = (pacienteId) => {
  const datos = obtenerDatosSync();
  if (pacienteId) {
    return datos.historialOdontologico.filter(h => h.pacienteId === pacienteId);
  }
  return datos.historialOdontologico || [];
};

// ==================== MIGRACIÓN DE DATOS EXISTENTES ====================

/**
 * Migra los datos existentes de los 3 localStorage separados al sistema unificado
 */
export const migrarDatosExistentes = () => {
  try {
    const datosSync = obtenerDatosSync();
    
    // Migrar datos de recepcionista
    const recepcionistaData = localStorage.getItem('recepcionistaData');
    if (recepcionistaData) {
      const datos = JSON.parse(recepcionistaData);
      if (datos.pacientes) {
        datosSync.pacientes = [...datosSync.pacientes, ...datos.pacientes];
      }
      if (datos.citas) {
        datosSync.citasDelDia = [...datosSync.citasDelDia, ...datos.citas.map(c => ({
          ...c,
          id: c.id || `cita_${Date.now()}_${Math.random()}`,
          enEnfermeria: false,
          preparado: false,
          enOdontologia: false
        }))];
        
        // Enviar citas confirmadas a enfermería
        datos.citas.forEach(cita => {
          if (cita.estado === 'Confirmada') {
            enviarPacienteAEnfermeria(cita, datosSync);
          }
        });
      }
    }
    
    // Migrar datos de enfermera
    const enfermeraData = localStorage.getItem('enfermeraData');
    if (enfermeraData) {
      const datos = JSON.parse(enfermeraData);
      if (datos.pacientesEspera) {
        datosSync.pacientesEnEspera = [...datosSync.pacientesEnEspera, ...datos.pacientesEspera];
      }
      if (datos.pacientesPreparados) {
        datosSync.pacientesPreparados = [...datosSync.pacientesPreparados, ...datos.pacientesPreparados];
      }
      if (datos.historialAtenciones) {
        datosSync.historialAtenciones = [...datosSync.historialAtenciones, ...datos.historialAtenciones];
      }
      if (datos.alertasMedicas) {
        datosSync.alertasMedicas = [...datosSync.alertasMedicas, ...datos.alertasMedicas];
      }
    }
    
    // Migrar datos de odontóloga
    const odontologaData = localStorage.getItem('odontologaData');
    if (odontologaData) {
      const datos = JSON.parse(odontologaData);
      if (datos.historialClinico) {
        datosSync.historialOdontologico = [...datosSync.historialOdontologico, ...datos.historialClinico];
      }
    }
    
    guardarDatosSync(datosSync);
    console.log('✅ Migración de datos completada exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error en la migración de datos:', error);
    return false;
  }
};

// ==================== UTILIDADES ====================

/**
 * Limpia todos los datos sincronizados (usar con precaución)
 */
export const limpiarDatosSync = () => {
  localStorage.removeItem(SYNC_KEY);
  return true;
};

/**
 * Hook personalizado para escuchar cambios en la sincronización
 */
export const useSyncListener = (callback) => {
  useEffect(() => {
    const handleSync = (event) => {
      callback(event.detail);
    };
    
    window.addEventListener('syncUpdate', handleSync);
    
    return () => {
      window.removeEventListener('syncUpdate', handleSync);
    };
  }, [callback]);
};