import { useState, useEffect } from 'react';
import {
  registrarSignosVitales,
  obtenerPacientesEnEspera,
  obtenerPacientesPreparados,
  obtenerHistorialAtenciones,
  obtenerAlertasMedicas
} from '../utils/syncUtils';

// ==================== HOOK PRINCIPAL ====================
export const useEnfermeraLogic = () => {
  // ===== ESTADOS PRINCIPALES =====
  const [pacientesEspera, setPacientesEspera] = useState([]);
  const [pacientesPreparados, setPacientesPreparados] = useState([]);
  const [historialAtenciones, setHistorialAtenciones] = useState([]);
  const [alertasMedicas, setAlertasMedicas] = useState([]);

  // ===== ESTADOS DE FORMULARIO SIGNOS VITALES =====
  const [formSignos, setFormSignos] = useState({
    presion: '',
    pulso: '',
    temperatura: '',
    observaciones: ''
  });

  const [erroresSignos, setErroresSignos] = useState({});
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  
  // ===== ESTADOS DE UI =====
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
    // Cargar datos desde el sistema sincronizado
    const espera = obtenerPacientesEnEspera();
    const preparados = obtenerPacientesPreparados();
    const historial = obtenerHistorialAtenciones();
    const alertas = obtenerAlertasMedicas();
    
    setPacientesEspera(espera);
    setPacientesPreparados(preparados);
    setHistorialAtenciones(historial);
    setAlertasMedicas(alertas);

    // Mostrar mensaje de bienvenida solo al iniciar sesión
    const mostrar = sessionStorage.getItem('mostrarBienvenida');
    if (mostrar === 'true') {
      const rol = sessionStorage.getItem('rol') || 'Enfermera';
      const nombre = sessionStorage.getItem('nombre') || '';
      const hora = new Date().toLocaleTimeString('es-EC', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      mostrarToast(`👋 ¡Bienvenida ${rol} ${nombre}! Inicio de sesión: ${hora}`);
      sessionStorage.removeItem('mostrarBienvenida');
    }
  };

  // ==================== VALIDACIONES ====================
  const validarSignosVitales = () => {
    const errores = {};
    let valido = true;

    // Validar presión arterial (formato: 120/80)
    const presionRegex = /^\d{2,3}\/\d{2,3}$/;
    if (!formSignos.presion.trim()) {
      errores.presion = 'La presión arterial es obligatoria';
      valido = false;
    } else if (!presionRegex.test(formSignos.presion.trim())) {
      errores.presion = 'Formato incorrecto (Ej: 120/80)';
      valido = false;
    }

    // Validar pulso (40-190 bpm)
    const pulso = parseInt(formSignos.pulso);
    if (!formSignos.pulso.trim()) {
      errores.pulso = 'El pulso es obligatorio';
      valido = false;
    } else if (isNaN(pulso) || pulso < 40 || pulso > 190) {
      errores.pulso = 'Pulso fuera de rango (40-190 bpm)';
      valido = false;
    }

    // Validar temperatura (34-42°C)
    const temp = parseFloat(formSignos.temperatura);
    if (!formSignos.temperatura.trim()) {
      errores.temperatura = 'La temperatura es obligatoria';
      valido = false;
    } else if (isNaN(temp) || temp < 34 || temp > 42) {
      errores.temperatura = 'Temperatura fuera de rango (34°C - 42°C)';
      valido = false;
    }

    setErroresSignos(errores);
    return valido;
  };

  // ==================== FORMATEO AUTOMÁTICO ====================
  const formatearPresion = (valor) => {
    let val = valor.replace(/\D/g, '');
    if (val.length > 3) {
      val = val.slice(0, 3) + '/' + val.slice(3, 6);
    }
    return val;
  };

  const formatearNumerico = (valor) => {
    return valor.replace(/[^\d.]/g, '');
  };

  // ==================== PREPARAR PACIENTE ====================
  const prepararPaciente = (paciente) => {
    setPacienteSeleccionado(paciente);
    setFormSignos({
      presion: '',
      pulso: '',
      temperatura: '',
      observaciones: ''
    });
    setErroresSignos({});
  };

  // ==================== GUARDAR SIGNOS VITALES ====================
  const handleGuardarSignos = (e) => {
    e.preventDefault();

    if (!validarSignosVitales()) {
      return false;
    }

    if (!pacienteSeleccionado) {
      mostrarToast('❌ No hay paciente seleccionado', 'error');
      return false;
    }

    // Preparar datos de signos vitales
    const signosVitales = {
      presion: formSignos.presion,
      pulso: formSignos.pulso + ' bpm',
      temperatura: formSignos.temperatura + '°C',
      observaciones: formSignos.observaciones.trim() || 'Ninguna'
    };

    // Usar sistema sincronizado
    const success = registrarSignosVitales(pacienteSeleccionado, signosVitales);

    if (success) {
      // Limpiar formulario
      resetFormSignos();
      setPacienteSeleccionado(null);

      // Recargar datos
      cargarDatos();

      // Mostrar mensaje de éxito
      mostrarToast('✅ Signos vitales registrados. Paciente enviado a odontología');
      
      return true;
    }

    return false;
  };

  // ==================== RESETEAR FORMULARIO ====================
  const resetFormSignos = () => {
    setFormSignos({
      presion: '',
      pulso: '',
      temperatura: '',
      observaciones: ''
    });
    setErroresSignos({});
  };

  // ==================== BÚSQUEDA ====================
  const pacientesFiltrados = pacientesEspera.filter(paciente =>
    paciente.paciente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ==================== TOAST ====================
  const mostrarToast = (mensaje, tipo = 'success') => {
    setSuccessMessage(mensaje);
    setShowSuccessMessage(true);

    setTimeout(() => {
      setShowSuccessMessage(false);
    }, tipo === 'success' ? 4000 : 3000);
  };

  // ==================== OBTENER FECHA ACTUAL ====================
  const obtenerFechaActual = () => {
    const opciones = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('es-ES', opciones);
  };

  // ==================== RETORNAR HOOK ====================
  return {
    // Estados
    pacientesEspera: pacientesFiltrados,
    pacientesPreparados,
    historialAtenciones,
    alertasMedicas,
    formSignos,
    setFormSignos,
    erroresSignos,
    pacienteSeleccionado,
    showSuccessMessage,
    successMessage,
    searchTerm,
    setSearchTerm,

    // Funciones
    prepararPaciente,
    handleGuardarSignos,
    resetFormSignos,
    formatearPresion,
    formatearNumerico,
    obtenerFechaActual
  };
};