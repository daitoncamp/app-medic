import { useState, useEffect } from 'react';
import {
  registrarNuevaCita,
  registrarNuevoPaciente,
  actualizarCita,
  eliminarCita,
  obtenerCitasDelDia,
  obtenerPacientes,
  migrarDatosExistentes
} from '../utils/syncUtils';

// ==================== HOOK PRINCIPAL ====================
export const useRecepcionistaLogic = () => {
  // ===== ESTADOS PRINCIPALES =====
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [indiceEdicion, setIndiceEdicion] = useState(null);
  
  // ===== ESTADOS DE FORMULARIO DE CITA =====
  const [formCita, setFormCita] = useState({
    cedula: '',
    paciente: '',
    fecha: '',
    hora: '',
    consulta: '',
    sexo: '',
    edad: '',
    telefono: '',
    email: '',
    estado: 'Pendiente'
  });

  // ===== ESTADOS DE REGISTRO RÁPIDO =====
  const [formRegistro, setFormRegistro] = useState({
    cedula: '',
    nombre: '',
    sexo: '',
    edad: '',
    telefono: '',
    correo: ''
  });

  // ===== ESTADOS DE ERRORES =====
  const [erroresCita, setErroresCita] = useState({});
  const [erroresRegistro, setErroresRegistro] = useState({});

  // ===== ESTADOS DE MENSAJES =====
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // ==================== INICIALIZACIÓN ====================
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
    // Intentar migrar datos existentes (solo se ejecuta una vez)
    const migracionRealizada = localStorage.getItem('migracionRealizada');
    if (!migracionRealizada) {
      migrarDatosExistentes();
      localStorage.setItem('migracionRealizada', 'true');
    }
    
    // Cargar datos desde el sistema sincronizado
    const citasSync = obtenerCitasDelDia();
    const pacientesSync = obtenerPacientes();
    
    setCitas(citasSync);
    setPacientes(pacientesSync);

    // ===== TOAST DE BIENVENIDA =====
    const mostrar = sessionStorage.getItem("mostrarBienvenida");
    if (mostrar === "true") {
      const rol = sessionStorage.getItem("rol") || "Usuario";
      const nombre = sessionStorage.getItem("nombre") || "";
      const hora = new Date().toLocaleTimeString("es-EC", { hour: '2-digit', minute: '2-digit' });
      
      setToastMessage(`👋 ¡Bienvenida ${rol} ${nombre}! Inicio de sesión: ${hora}`);
      setShowToast(true);
      
      setTimeout(() => setShowToast(false), 4000);
      sessionStorage.removeItem("mostrarBienvenida");
    }
  };

  // ==================== VALIDACIONES ====================
  const validarCedula = (valor) => {
    if (!/^\d{10}$/.test(valor.trim())) {
      return "Ingrese un número de cédula válido (10 dígitos).";
    }
    return "";
  };

  const validarNombre = (valor) => {
    const soloLetras = /^[a-zA-ZÁÉÍÓÚáéíóúñÑ ]+$/;
    if (!soloLetras.test(valor.trim())) {
      return "Solo se permiten letras y espacios.";
    }
    if (valor.trim().length < 15) {
      return "El nombre debe tener al menos 15 caracteres.";
    }
    return "";
  };

  const validarTelefono = (valor) => {
    if (!/^09\d{8}$/.test(valor.trim())) {
      return "Formato: 09xxxxxxxx (10 dígitos).";
    }
    return "";
  };

  const validarEdad = (valor) => {
    const edad = parseInt(valor);
    if (isNaN(edad) || edad < 0 || edad > 120) {
      return "Ingrese una edad válida (0-120).";
    }
    return "";
  };

  const validarEmail = (valor) => {
    if (!valor.trim()) {
      return "El correo es obligatorio.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim())) {
      return "Formato de correo inválido.";
    }
    return "";
  };

  // ==================== VALIDAR FORMULARIO CITA ====================
  const validarFormularioCita = () => {
    const errores = {};
    let valido = true;

    if (!formCita.cedula.trim()) {
      errores.cedula = "Este campo es obligatorio.";
      valido = false;
    } else {
      const errorCedula = validarCedula(formCita.cedula);
      if (errorCedula) {
        errores.cedula = errorCedula;
        valido = false;
      }
    }

    if (!formCita.paciente.trim()) {
      errores.paciente = "Este campo es obligatorio.";
      valido = false;
    } else {
      const errorNombre = validarNombre(formCita.paciente);
      if (errorNombre) {
        errores.paciente = errorNombre;
        valido = false;
      }
    }

    if (!formCita.fecha.trim()) {
      errores.fecha = "Este campo es obligatorio.";
      valido = false;
    }

    if (!formCita.hora.trim()) {
      errores.hora = "Este campo es obligatorio.";
      valido = false;
    }

    if (!formCita.consulta.trim()) {
      errores.consulta = "Este campo es obligatorio.";
      valido = false;
    }

    if (!formCita.sexo.trim()) {
      errores.sexo = "Este campo es obligatorio.";
      valido = false;
    }

    if (!formCita.edad.trim()) {
      errores.edad = "Este campo es obligatorio.";
      valido = false;
    } else {
      const errorEdad = validarEdad(formCita.edad);
      if (errorEdad) {
        errores.edad = errorEdad;
        valido = false;
      }
    }

    if (!formCita.telefono.trim()) {
      errores.telefono = "Este campo es obligatorio.";
      valido = false;
    } else {
      const errorTelefono = validarTelefono(formCita.telefono);
      if (errorTelefono) {
        errores.telefono = errorTelefono;
        valido = false;
      }
    }

    if (!formCita.email.trim()) {
      errores.email = "Este campo es obligatorio.";
      valido = false;
    } else {
      const errorEmail = validarEmail(formCita.email);
      if (errorEmail) {
        errores.email = errorEmail;
        valido = false;
      }
    }

    setErroresCita(errores);
    return valido;
  };

  // ==================== AGREGAR / EDITAR CITA ====================
  const handleSubmitCita = (e) => {
    e.preventDefault();

    if (!validarFormularioCita()) return false;

    if (indiceEdicion === null) {
      // NUEVA CITA - Usar sistema sincronizado
      const success = registrarNuevaCita(formCita);
      
      if (success) {
        setToastMessage("✅ Cita agendada exitosamente y enviada a enfermería");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        
        // Recargar datos
        cargarDatos();
        resetFormCita();
        return true;
      }
    } else {
      // EDITAR CITA EXISTENTE
      const estadoAnterior = citas[indiceEdicion] ? citas[indiceEdicion].estado : "Pendiente";
      
      const citaActualizada = {
        ...formCita,
        estado: estadoAnterior
      };
      
      const success = actualizarCita(indiceEdicion, citaActualizada);
      
      if (success) {
        setToastMessage("✅ Cita actualizada exitosamente");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        
        cargarDatos();
        resetFormCita();
        return true;
      }
    }

    return false;
  };

  // ==================== EDITAR CITA ====================
  const handleEditarCita = (index) => {
    const cita = citas[index];
    if (!cita) return;

    setIndiceEdicion(index);
    setFormCita({
      cedula: cita.cedula || '',
      paciente: cita.paciente || '',
      fecha: cita.fecha || '',
      hora: cita.hora || '',
      consulta: cita.consulta || '',
      sexo: cita.sexo || '',
      edad: cita.edad || '',
      telefono: cita.telefono || '',
      email: cita.email || '',
      estado: cita.estado || 'Pendiente'
    });
    setErroresCita({});
  };

  // ==================== ELIMINAR CITA ====================
  const handleEliminarCita = (index) => {
    if (window.confirm("¿Desea eliminar esta cita?")) {
      const success = eliminarCita(index);
      
      if (success) {
        setToastMessage("✅ Cita eliminada exitosamente");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        
        cargarDatos();
      }
    }
  };

  // ==================== CONFIRMAR CITA ====================
  const handleConfirmarCita = (index) => {
    const cita = citas[index];
    if (!cita) return;

    // Actualizar el estado de la cita a "Confirmada"
    const citaConfirmada = {
      ...cita,
      estado: 'Confirmada'
    };

    const success = actualizarCita(index, citaConfirmada);

    if (success) {
      setToastMessage("✅ Cita confirmada y enviada a enfermería");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      cargarDatos();
    }
  };

  // ==================== RESET FORMULARIO CITA ====================
  const resetFormCita = () => {
    setFormCita({
      cedula: '',
      paciente: '',
      fecha: '',
      hora: '',
      consulta: '',
      sexo: '',
      edad: '',
      telefono: '',
      email: '',
      estado: 'Pendiente'
    });
    setIndiceEdicion(null);
    setErroresCita({});
  };

  // ==================== VALIDAR FORMULARIO REGISTRO ====================
  const validarFormularioRegistro = () => {
    const errores = {};
    let valido = true;

    if (!formRegistro.cedula.trim()) {
      errores.cedula = "Este campo no puede estar vacío";
      valido = false;
    } else {
      const errorCedula = validarCedula(formRegistro.cedula);
      if (errorCedula) {
        errores.cedula = errorCedula;
        valido = false;
      }
    }

    if (!formRegistro.nombre.trim()) {
      errores.nombre = "Este campo no puede estar vacío";
      valido = false;
    } else {
      const errorNombre = validarNombre(formRegistro.nombre);
      if (errorNombre) {
        errores.nombre = errorNombre;
        valido = false;
      }
    }

    if (!formRegistro.sexo.trim()) {
      errores.sexo = "Seleccione el sexo.";
      valido = false;
    }

    if (!formRegistro.edad.trim()) {
      errores.edad = "Este campo no puede estar vacío";
      valido = false;
    } else {
      const errorEdad = validarEdad(formRegistro.edad);
      if (errorEdad) {
        errores.edad = errorEdad;
        valido = false;
      }
    }

    if (!formRegistro.telefono.trim()) {
      errores.telefono = "Este campo no puede estar vacío";
      valido = false;
    } else {
      const errorTelefono = validarTelefono(formRegistro.telefono);
      if (errorTelefono) {
        errores.telefono = errorTelefono;
        valido = false;
      }
    }

    if (!formRegistro.correo.trim()) {
      errores.correo = "Este campo no puede estar vacío";
      valido = false;
    } else {
      const errorEmail = validarEmail(formRegistro.correo);
      if (errorEmail) {
        errores.correo = errorEmail;
        valido = false;
      }
    }

    setErroresRegistro(errores);
    return valido;
  };

  // ==================== REGISTRO RÁPIDO DE PACIENTE ====================
  const handleRegistrarPaciente = (e) => {
    e.preventDefault();

    if (!validarFormularioRegistro()) return;

    // Usar sistema sincronizado
    const success = registrarNuevoPaciente(formRegistro);

    if (success) {
      setToastMessage("✅ Paciente registrado y enviado a enfermería automáticamente");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      cargarDatos();
      
      setFormRegistro({
        cedula: '',
        nombre: '',
        sexo: '',
        edad: '',
        telefono: '',
        correo: ''
      });
      setErroresRegistro({});
    }
  };

  // ==================== BÚSQUEDA DE CITAS ====================
  const citasFiltradas = citas.filter(cita =>
    cita.paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cita.cedula.includes(searchTerm)
  );

  // ==================== ESTADÍSTICAS ====================
  const estadisticas = {
    total: citas.length,
    confirmadas: citas.filter(c => c.estado === "Confirmada").length,
    pendientes: citas.filter(c => c.estado === "Pendiente").length
  };

  // ==================== DESCARGAR REPORTE JSON ====================
  const handleDescargarReporte = () => {
    const fechaHoy = new Date().toLocaleDateString("es-ES");
    
    const reporte = {
      fecha_reporte: fechaHoy,
      estadisticas: {
        total_citas: estadisticas.total,
        citas_confirmadas: estadisticas.confirmadas,
        citas_pendientes: estadisticas.pendientes
      },
      citas: citas,
      pacientes: pacientes
    };

    const blob = new Blob([JSON.stringify(reporte, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_recepcionista_${fechaHoy.replace(/\//g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==================== FECHA ACTUAL FORMATEADA ====================
  const obtenerFechaActual = () => {
    const hoy = new Date();
    const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const fechaFormateada = hoy.toLocaleDateString('es-ES', opciones);
    return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  };

  // ==================== RETORNAR TODO ====================
  return {
    // Estados principales
    citas: citasFiltradas,
    pacientes,
    indiceEdicion,

    // Formulario de cita
    formCita,
    setFormCita,
    erroresCita,

    // Formulario de registro
    formRegistro,
    setFormRegistro,
    erroresRegistro,

    // Búsqueda
    searchTerm,
    setSearchTerm,

    // Estadísticas
    estadisticas,

    // Toast
    showToast,
    toastMessage,

    // Funciones de cita
    handleSubmitCita,
    handleEditarCita,
    handleEliminarCita,
    handleConfirmarCita,
    resetFormCita,

    // Funciones de registro
    handleRegistrarPaciente,

    // Otras funciones
    handleDescargarReporte,
    obtenerFechaActual
  };
};