import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import {
  obtenerPacientesOdontologia,
  registrarDiagnostico,
  obtenerHistorialOdontologico,
  obtenerDatosSync,
  guardarDatosSync
} from '../utils/syncUtils';

// ==================== HOOK PRINCIPAL ====================
export const useOdontologaLogic = () => {
  // ===== ESTADOS PRINCIPALES =====
  const [pacientes, setPacientes] = useState([]);
  const [pacienteActual, setPacienteActual] = useState(null);
  const [historialClinico, setHistorialClinico] = useState([]);

  // ===== ESTADOS DE FORMULARIO DIAGNÓSTICO =====
  const [formDiagnostico, setFormDiagnostico] = useState({
    diagnostico: '',
    diente: '',
    procedimiento: 'Limpieza',
    notas: ''
  });

  const [erroresDiagnostico, setErroresDiagnostico] = useState({});

  // ===== ESTADOS DE RECETA MÉDICA =====
  const [formReceta, setFormReceta] = useState({
    medicamento: '',
    dosis: '',
    frecuencia: '',
    duracion: '',
    indicaciones: ''
  });

  const [erroresReceta, setErroresReceta] = useState({});

  // ===== ESTADOS DE ODONTOGRAMA =====
  const [modoAdulto, setModoAdulto] = useState(true);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('sano');
  const [estadosDientes, setEstadosDientes] = useState({});
  const [dienteSeleccionadoParaLimpiar, setDienteSeleccionadoParaLimpiar] = useState(null);

  // ===== ESTADOS DE HISTORIAL =====
  const [fechaHistorial, setFechaHistorial] = useState('');
  const [errorFechaHistorial, setErrorFechaHistorial] = useState('');

  // ===== ESTADOS DE UI =====
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ==================== CARGA INICIAL ====================
  useEffect(() => {
    cargarDatos();
    
    // Escuchar actualizaciones de sincronización
    const handleSyncUpdate = () => {
      cargarDatos();
    };
    
    window.addEventListener('syncUpdate', handleSyncUpdate);
    
    return () => {
      window.removeEventListener('syncUpdate', handleSyncUpdate);
    };
  }, []);

  const cargarDatos = () => {
    // Cargar pacientes desde el sistema sincronizado
    const pacientesSync = obtenerPacientesOdontologia();
    setPacientes(pacientesSync);
    
    // Si hay pacientes, seleccionar el primero por defecto
    if (pacientesSync.length > 0 && !pacienteActual) {
      setPacienteActual(pacientesSync[0]);
    }
    
    // Cargar historial del paciente actual
    if (pacienteActual) {
      const historial = obtenerHistorialOdontologico(pacienteActual.id);
      setHistorialClinico(historial);
    }
    
    // Cargar estados de dientes guardados
    const datos = obtenerDatosSync();
    if (datos.estadosDientes) {
      setEstadosDientes(datos.estadosDientes);
    }

    // Mostrar mensaje de bienvenida
    const mostrar = sessionStorage.getItem('mostrarBienvenida');
    if (mostrar === 'true') {
      const rol = sessionStorage.getItem('rol') || 'Odontóloga';
      const nombre = sessionStorage.getItem('nombre') || '';
      const hora = new Date().toLocaleTimeString('es-EC', {
        hour: '2-digit',
        minute: '2-digit'
      });

      mostrarToast(`👋 ¡Bienvenida ${rol} ${nombre}! Inicio de sesión: ${hora}`);
      sessionStorage.removeItem('mostrarBienvenida');
    }
  };

  // ==================== VALIDAR DIAGNÓSTICO ====================
  const validarDiagnostico = () => {
    const errores = {};
    let valido = true;

    // Validar diagnóstico
    if (!formDiagnostico.diagnostico.trim()) {
      errores.diagnostico = 'El diagnóstico no puede estar vacío.';
      valido = false;
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s,.()-]+$/.test(formDiagnostico.diagnostico)) {
      errores.diagnostico = 'El diagnóstico contiene caracteres inválidos.';
      valido = false;
    }

    // Validar pieza dental
    if (!formDiagnostico.diente.trim()) {
      errores.diente = 'La pieza dental no puede estar vacía.';
      valido = false;
    } else if (!/^[0-9,\s]+$/.test(formDiagnostico.diente)) {
      errores.diente = 'Solo números y comas (ejemplo: 11, 26, 36).';
      valido = false;
    }

    // Validar procedimiento
    if (!formDiagnostico.procedimiento.trim()) {
      errores.procedimiento = 'Debe seleccionar un procedimiento.';
      valido = false;
    }

    // Validar notas
    if (formDiagnostico.notas.length > 300) {
      errores.notas = 'Las notas no deben exceder los 300 caracteres.';
      valido = false;
    }

    setErroresDiagnostico(errores);
    return valido;
  };

  // ==================== GUARDAR DIAGNÓSTICO ====================
  const handleGuardarDiagnostico = (e) => {
    e.preventDefault();

    if (!validarDiagnostico()) {
      return false;
    }

    if (!pacienteActual) {
      mostrarToast('❌ No hay paciente seleccionado');
      return false;
    }

    // Usar sistema sincronizado
    const success = registrarDiagnostico(pacienteActual, formDiagnostico);

    if (success) {
      // Recargar datos
      cargarDatos();
      
      // Limpiar formulario
      resetFormDiagnostico();

      // Mostrar mensaje
      mostrarToast('✅ Diagnóstico guardado correctamente.');
      return true;
    }

    return false;
  };

  // ==================== VALIDAR RECETA ====================
  const validarReceta = () => {
    const errores = {};
    let valido = true;

    // Validar medicamento
    if (!formReceta.medicamento.trim()) {
      errores.medicamento = 'Ingrese el medicamento.';
      valido = false;
    } else if (/\d/.test(formReceta.medicamento)) {
      errores.medicamento = 'Ingrese el nombre del medicamento.';
      valido = false;
    }

    // Validar dosis
    if (!formReceta.dosis.trim()) {
      errores.dosis = 'Campo obligatorio.';
      valido = false;
    } else if (formReceta.dosis.includes('-')) {
      errores.dosis = 'Ingrese un valor correcto.';
      valido = false;
    }

    // Validar frecuencia
    if (!formReceta.frecuencia.trim()) {
      errores.frecuencia = 'Campo obligatorio.';
      valido = false;
    } else if (formReceta.frecuencia.includes('-')) {
      errores.frecuencia = 'Ingrese un valor correcto.';
      valido = false;
    }

    // Validar duración
    if (!formReceta.duracion.trim()) {
      errores.duracion = 'Campo obligatorio.';
      valido = false;
    } else if (formReceta.duracion.includes('-')) {
      errores.duracion = 'Ingrese un valor correcto.';
      valido = false;
    }

    setErroresReceta(errores);
    return valido;
  };

  // ==================== GENERAR RECETA PDF ====================
  const handleGenerarRecetaPDF = () => {
    if (!validarReceta()) {
      return false;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CARRERA DE ODONTOLOGÍA - Uleam', 55, 18);
    doc.setFontSize(12);
    doc.text('Receta Médica', 90, 28);

    // Información del paciente
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Paciente: ${pacienteActual?.nombre || 'Sin nombre'}`, 15, 45);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 150, 45);

    // Datos de receta
    doc.setFont('helvetica', 'bold');
    doc.text('Medicamento:', 15, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(formReceta.medicamento, 50, 60);

    doc.setFont('helvetica', 'bold');
    doc.text('Dosis:', 15, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(formReceta.dosis, 40, 70);

    doc.setFont('helvetica', 'bold');
    doc.text('Frecuencia:', 15, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(formReceta.frecuencia, 45, 80);

    doc.setFont('helvetica', 'bold');
    doc.text('Duración:', 15, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(formReceta.duracion, 45, 90);

    doc.setFont('helvetica', 'bold');
    doc.text('Indicaciones:', 15, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(formReceta.indicaciones || 'Sin indicaciones adicionales.', 15, 112, {
      maxWidth: 180
    });

    // Firma
    doc.line(130, 260, 190, 260);
    doc.setFont('helvetica', 'italic');
    doc.text('Dra. María Fernanda López', 135, 265);
    doc.text('Odontóloga tratante', 145, 270);

    // Guardar PDF
    doc.save(`Receta_${formReceta.medicamento.replace(/\s+/g, '_')}.pdf`);

    // Limpiar formulario
    resetFormReceta();

    // Mostrar mensaje
    mostrarToast('✅ Receta médica generada y descargada correctamente.');
    return true;
  };

  // ==================== GENERAR HISTORIAL PDF ====================
  const handleGenerarHistorialPDF = () => {
    // Validar fecha
    if (!fechaHistorial.trim()) {
      setErrorFechaHistorial('Este campo es obligatorio.');
      return false;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('CARRERA DE ODONTOLOGÍA - Uleam', 55, 18);

    // Datos del paciente
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Paciente: ${pacienteActual?.nombre || 'Sin nombre'}`, 10, 34);
    doc.text(`Edad: ${pacienteActual?.edad || 'N/A'}`, 10, 40);
    doc.text(`Cédula: ${pacienteActual?.cedula || 'N/A'}`, 10, 46);
    doc.text(`Género: ${pacienteActual?.sexo || 'N/A'}`, 10, 52);

    // Signos vitales (si existen)
    if (pacienteActual?.signosVitales) {
      doc.setFont('helvetica', 'bold');
      doc.text('Signos Vitales (Enfermería):', 10, 62);
      doc.setFont('helvetica', 'normal');
      doc.text(`Presión arterial: ${pacienteActual.signosVitales.presion || 'N/A'}`, 10, 68);
      doc.text(`Frecuencia cardíaca: ${pacienteActual.signosVitales.pulso || 'N/A'}`, 10, 74);
      doc.text(`Temperatura: ${pacienteActual.signosVitales.temperatura || 'N/A'}`, 10, 80);
    }

    // Registro odontológico
    doc.setFont('helvetica', 'bold');
    doc.text('Registro Odontológico:', 10, 98);
    doc.setFont('helvetica', 'normal');
    doc.text('Odontóloga responsable: Dra. María Fernanda López', 10, 104);

    // Normalizar fecha
    const normalizarFecha = (f) => {
      const partes = f.split('/');
      if (partes.length === 3) {
        const dia = partes[0];
        const mesNum = parseInt(partes[1]);
        const anio = partes[2];
        const meses = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${parseInt(dia)} ${meses[mesNum - 1]} ${anio}`;
      }
      return f;
    };

    const fechaNormalizada = normalizarFecha(fechaHistorial);

    // Tabla de procedimientos
    let y = 122;
    doc.setFont('helvetica', 'bold');
    doc.text('Diente', 10, y);
    doc.text('Procedimiento', 40, y);
    doc.text('Fecha', 105, y);
    doc.text('Estado', 150, y);
    doc.line(10, y + 1, 200, y + 1);

    doc.setFont('helvetica', 'normal');
    y += 8;
    let encontrados = 0;

    historialClinico.forEach((p) => {
      if (p.fecha === fechaNormalizada) {
        doc.text(p.diente, 12, y);
        doc.text(p.procedimiento, 40, y);
        doc.text(p.fecha, 105, y);
        doc.text(p.estado === 'completado' ? 'Completado' : p.estado === 'proceso' ? 'En Proceso' : 'Pendiente', 150, y);
        y += 8;
        encontrados++;
      }
    });

    if (encontrados === 0) {
      doc.text('No existen registros para la fecha seleccionada.', 10, y);
    }

    // Pie de página
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Universidad Laica Eloy Alfaro de Manabí (Uleam)', 60, 285);
    doc.text('Historial clínico generado correctamente.', 68, 291);

    // Guardar PDF
    const nombreArchivo = `Historial_${fechaHistorial.replace(/\//g, '-')}.pdf`;
    doc.save(nombreArchivo);

    // Limpiar campo
    setFechaHistorial('');
    setErrorFechaHistorial('');

    // Mostrar mensaje
    mostrarToast('✅ Historial clínico generado y descargado correctamente.');
    return true;
  };

  // ==================== CAMBIAR PACIENTE ====================
  const handleCambiarPaciente = (paciente) => {
    setPacienteActual(paciente);
    setFormDiagnostico({
      ...formDiagnostico,
      procedimiento: paciente.tratamiento || 'Limpieza'
    });
    
    // Cargar historial del paciente
    const historial = obtenerHistorialOdontologico(paciente.id);
    setHistorialClinico(historial);
  };

  // ==================== ODONTOGRAMA ====================
  const handleClickDiente = (numeroDiente) => {
    // Si hay un estado seleccionado, aplicarlo
    if (estadoSeleccionado) {
      const nuevosEstados = {
        ...estadosDientes,
        [numeroDiente]: estadoSeleccionado
      };
      setEstadosDientes(nuevosEstados);

      // Guardar en sistema sincronizado
      const datos = obtenerDatosSync();
      datos.estadosDientes = nuevosEstados;
      guardarDatosSync(datos);
    }
    
    // Seleccionar el diente para poder limpiarlo
    setDienteSeleccionadoParaLimpiar(numeroDiente);
  };

  // ==================== LIMPIAR DIENTE INDIVIDUAL ====================
  const handleLimpiarDiente = () => {
    if (!dienteSeleccionadoParaLimpiar) {
      mostrarToast('⚠️ Selecciona un diente primero');
      return;
    }

    // Crear una copia sin el diente seleccionado
    const nuevosEstados = { ...estadosDientes };
    delete nuevosEstados[dienteSeleccionadoParaLimpiar];
    
    setEstadosDientes(nuevosEstados);
    
    // Guardar en sistema sincronizado
    const datos = obtenerDatosSync();
    datos.estadosDientes = nuevosEstados;
    guardarDatosSync(datos);
    
    mostrarToast(`✅ Diente ${dienteSeleccionadoParaLimpiar} limpiado`);
    setDienteSeleccionadoParaLimpiar(null);
  };

  // ==================== LIMPIAR TODO EL ODONTOGRAMA ====================
  const handleLimpiarTodoOdontograma = () => {
    if (window.confirm('¿Estás seguro de limpiar todos los dientes del odontograma?')) {
      setEstadosDientes({});
      setDienteSeleccionadoParaLimpiar(null);
      
      // Guardar en sistema sincronizado
      const datos = obtenerDatosSync();
      datos.estadosDientes = {};
      guardarDatosSync(datos);
      
      mostrarToast('✅ Odontograma limpiado completamente');
    }
  };

  // ==================== FORMATEO DE FECHA ====================
  const formatearFecha = (valor) => {
    let numeros = valor.replace(/\D/g, '');
    if (numeros.length > 2 && numeros.length <= 4) {
      numeros = numeros.replace(/(\d{2})(\d{0,2})/, '$1/$2');
    } else if (numeros.length > 4) {
      numeros = numeros.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
    }
    return numeros;
  };

  // ==================== RESETEAR FORMULARIOS ====================
  const resetFormDiagnostico = () => {
    setFormDiagnostico({
      diagnostico: '',
      diente: '',
      procedimiento: 'Limpieza',
      notas: ''
    });
    setErroresDiagnostico({});
  };

  const resetFormReceta = () => {
    setFormReceta({
      medicamento: '',
      dosis: '',
      frecuencia: '',
      duracion: '',
      indicaciones: ''
    });
    setErroresReceta({});
  };

  // ==================== TOAST ====================
  const mostrarToast = (mensaje) => {
    setSuccessMessage(mensaje);
    setShowSuccessMessage(true);

    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 4000);
  };

  // ==================== COLORES DE ESTADO ====================
  const getColorEstado = (estado) => {
    const colores = {
      sano: '#4ade80',
      caries: '#ef4444',
      tratado: '#3b82f6',
      observacion: '#fbbf24',
      ausente: '#6b7280'
    };
    return colores[estado] || '#e5e7eb';
  };

  // ==================== RETORNAR HOOK ====================
  return {
    // Estados
    pacientes,
    pacienteActual,
    historialClinico,
    formDiagnostico,
    setFormDiagnostico,
    erroresDiagnostico,
    formReceta,
    setFormReceta,
    erroresReceta,
    modoAdulto,
    setModoAdulto,
    estadoSeleccionado,
    setEstadoSeleccionado,
    estadosDientes,
    fechaHistorial,
    setFechaHistorial,
    errorFechaHistorial,
    showSuccessMessage,
    successMessage,

    // Funciones
    handleGuardarDiagnostico,
    handleGenerarRecetaPDF,
    handleGenerarHistorialPDF,
    handleCambiarPaciente,
    handleClickDiente,
    handleLimpiarDiente,
    handleLimpiarTodoOdontograma,
    formatearFecha,
    resetFormDiagnostico,
    resetFormReceta,
    getColorEstado,
    dienteSeleccionadoParaLimpiar,
    setDienteSeleccionadoParaLimpiar
  };
};