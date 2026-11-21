import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faRightFromBracket,
  faPlus,
  faMagnifyingGlass,
  faFileArrowDown,
  faCalendar,
  faPen,
  faTrash,
  faPhone,
  faEnvelope,
  faCheckCircle
} from "@fortawesome/free-solid-svg-icons";

import { useRecepcionistaLogic } from '../logic/RecepcionistaLogic';
import "./recepcionista.css";
import logoUleam from '../assets/logo-uleam.png';
import { cerrarSesion } from '../services/authService';

function RecepcionistaDashboard() {
  const navigate = useNavigate();

  // 🔥 IMPORTAR TODA LA LÓGICA
  const {
    citas,
    formCita,
    setFormCita,
    erroresCita,
    formRegistro,
    setFormRegistro,
    erroresRegistro,
    searchTerm,
    setSearchTerm,
    estadisticas,
    indiceEdicion,
    showToast,
    toastMessage,
    handleSubmitCita,
    handleEditarCita,
    handleEliminarCita,
    handleConfirmarCita,
    resetFormCita,
    handleRegistrarPaciente,
    handleDescargarReporte,
    obtenerFechaActual
  } = useRecepcionistaLogic();

  // Estados de modales
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Cerrar sesión
  const handleLogout = () => {
    cerrarSesion();
    navigate("/login-recepcionista");
  };

  // Manejar submit con cierre de modal
  const onSubmitCita = (e) => {
    const success = handleSubmitCita(e);
    if (success) {
      setShowAppointmentModal(false);
    }
  };

  // Abrir modal en modo edición
  const onEditarCita = (index) => {
    handleEditarCita(index);
    setShowAppointmentModal(true);
  };

  // Abrir modal en modo nueva cita
  const onNuevaCita = () => {
    resetFormCita();
    setShowAppointmentModal(true);
  };

  // Confirmar cita desde la tabla
  const onConfirmarCita = (index) => {
    handleConfirmarCita(index);
  };

  return (
    <div className="dashboard-wrapper">
      <img
        src={logoUleam}
        alt="Logo"
        className="logo-image" 
      />

      {/* ===== TOAST DE MENSAJES ===== */}
      {showToast && (
        <div className="toast-bienvenida">
          {toastMessage}
        </div>
      )}

      {/* ===== HEADER ===== */}
      <header className="header centered">
        <div className="header-left">
          <div className="header-icon">
            <div className="icon-circle blue">
              <FontAwesomeIcon icon={faUser} />
            </div>
          </div>
          <div className="header-info">
            <h1>Recepcionista</h1>
            <p>Gestión de citas y pacientes</p>
          </div>
        </div>

        <div className="header-right">
          <button
            className="logout-link"
            onClick={() => setShowLogoutModal(true)}
          >
            <FontAwesomeIcon icon={faRightFromBracket} /> Cerrar sesión
          </button>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="main-content">
        <section className="appointments-section">
          <div className="section-header">
            <h2>
              <FontAwesomeIcon icon={faCalendar} /> Citas del día
            </h2>

            <button
              className="new-appointment-btn"
              onClick={onNuevaCita}
            >
              <FontAwesomeIcon icon={faPlus} /> Nueva cita
            </button>
          </div>

          <p className="date">{obtenerFechaActual()}</p>

          <div className="search-bar">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input 
              type="text" 
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <table className="appointments-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Paciente</th>
                <th>Tipo de consulta</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="appointmentTable">
              {citas.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    No hay citas registradas
                  </td>
                </tr>
              ) : (
                citas.map((cita, index) => (
                  <tr key={index}>
                    <td>{cita.hora}</td>
                    <td>{cita.paciente}</td>
                    <td>{cita.consulta}</td>
                    <td>
                      <span className={`status ${cita.estado.toLowerCase()}`}>
                        {cita.estado}
                      </span>
                    </td>
                    <td className="actions">
                      {/* Botón de confirmar solo si está pendiente */}
                      {cita.estado === 'Pendiente' && (
                        <button 
                          className="btn-confirm" 
                          title="Confirmar cita y enviar a enfermería"
                          onClick={() => onConfirmarCita(index)}
                        >
                          <FontAwesomeIcon icon={faCheckCircle} />
                        </button>
                      )}
                      
                      <button 
                        className="btn-edit" 
                        title="Editar cita"
                        onClick={() => onEditarCita(index)}
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button 
                        className="btn-delete" 
                        title="Eliminar cita"
                        onClick={() => handleEliminarCita(index)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                      <button title="Llamar">
                        <FontAwesomeIcon icon={faPhone} />
                      </button>
                      <button title="Enviar correo">
                        <FontAwesomeIcon icon={faEnvelope} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="stats-and-form">
          <div className="stats">
            <h3>Estadísticas del día</h3>

            <div className="stat-box total">
              <p>Total de citas</p>
              <span>{estadisticas.total}</span>
            </div>

            <div className="stat-box confirmed">
              <p>Confirmadas</p>
              <span>{estadisticas.confirmadas}</span>
            </div>

            <div className="stat-box pending">
              <p>Pendientes</p>
              <span>{estadisticas.pendientes}</span>
            </div>

            <br />
            <button 
              className="download-json-btn"
              id="downloadJsonBtn"
              onClick={handleDescargarReporte}
            >
              <FontAwesomeIcon icon={faFileArrowDown} /> Descargar reportes
            </button>
          </div>

          <form className="register-form" onSubmit={handleRegistrarPaciente}>
            <h3>Registro rápido de paciente</h3>

            <label>Cédula</label>
            <input 
              type="text"
              value={formRegistro.cedula}
              onChange={(e) => setFormRegistro({...formRegistro, cedula: e.target.value})}
              className={erroresRegistro.cedula ? 'shake' : ''}
            />
            {erroresRegistro.cedula && (
              <small className="error-msg">{erroresRegistro.cedula}</small>
            )}

            <label>Nombres completos</label>
            <input 
              type="text"
              value={formRegistro.nombre}
              onChange={(e) => setFormRegistro({...formRegistro, nombre: e.target.value})}
              className={erroresRegistro.nombre ? 'shake' : ''}
            />
            {erroresRegistro.nombre && (
              <small className="error-msg">{erroresRegistro.nombre}</small>
            )}

            <label>Sexo</label>
            <select
              value={formRegistro.sexo}
              onChange={(e) => setFormRegistro({...formRegistro, sexo: e.target.value})}
              className={erroresRegistro.sexo ? 'shake' : ''}
            >
              <option value="">Seleccione...</option>
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
              <option value="Otro">Otro</option>
            </select>
            {erroresRegistro.sexo && (
              <small className="error-msg">{erroresRegistro.sexo}</small>
            )}

            <label>Edad</label>
            <input 
              type="number" 
              min="0" 
              max="120"
              value={formRegistro.edad}
              onChange={(e) => setFormRegistro({...formRegistro, edad: e.target.value})}
              className={erroresRegistro.edad ? 'shake' : ''}
            />
            {erroresRegistro.edad && (
              <small className="error-msg">{erroresRegistro.edad}</small>
            )}

            <label>Teléfono</label>
            <input 
              type="text"
              value={formRegistro.telefono}
              onChange={(e) => setFormRegistro({...formRegistro, telefono: e.target.value})}
              className={erroresRegistro.telefono ? 'shake' : ''}
            />
            {erroresRegistro.telefono && (
              <small className="error-msg">{erroresRegistro.telefono}</small>
            )}

            <label>Correo electrónico</label>
            <input 
              type="email"
              value={formRegistro.correo}
              onChange={(e) => setFormRegistro({...formRegistro, correo: e.target.value})}
              className={erroresRegistro.correo ? 'shake' : ''}
            />
            {erroresRegistro.correo && (
              <small className="error-msg">{erroresRegistro.correo}</small>
            )}

            <button type="submit" className="register-btn">
              Registrar paciente
            </button>
          </form>
        </section>
      </main>

      {/* ===== MODAL NUEVA CITA ===== */}
      <div className={`modal ${showAppointmentModal ? "show" : ""}`} id="appointmentModal">
        <div className="modal-content">
          <span
            className="close-modal"
            id="closeModal"
            onClick={() => setShowAppointmentModal(false)}
          >
            &times;
          </span>

          <h2>{indiceEdicion !== null ? 'Editar cita' : 'Agendar nueva cita'}</h2>
          <p>Complete los datos para {indiceEdicion !== null ? 'actualizar' : 'agendar'} una cita</p>

          <form id="appointmentForm" onSubmit={onSubmitCita}>
            <label>Cédula del paciente</label>
            <input 
              type="text"
              placeholder="Cédula del Paciente"
              value={formCita.cedula}
              onChange={(e) => setFormCita({...formCita, cedula: e.target.value})}
              className={erroresCita.cedula ? 'shake' : ''}
            />
            {erroresCita.cedula && (
              <small className="error-msg">{erroresCita.cedula}</small>
            )}

            <label>Nombre del paciente</label>
            <input 
              type="text"
              placeholder="Nombre completo"
              value={formCita.paciente}
              onChange={(e) => setFormCita({...formCita, paciente: e.target.value})}
              className={erroresCita.paciente ? 'shake' : ''}
            />
            {erroresCita.paciente && (
              <small className="error-msg">{erroresCita.paciente}</small>
            )}

            <div className="row">
              <div className="col">
                <label>Fecha</label>
                <input 
                  type="date"
                  id="fecha"
                  value={formCita.fecha}
                  onChange={(e) => setFormCita({...formCita, fecha: e.target.value})}
                  className={erroresCita.fecha ? 'shake' : ''}
                />
                {erroresCita.fecha && (
                  <small className="error-msg">{erroresCita.fecha}</small>
                )}
              </div>
              <div className="col">
                <label>Hora</label>
                <input 
                  type="time"
                  id="hora"
                  value={formCita.hora}
                  onChange={(e) => setFormCita({...formCita, hora: e.target.value})}
                  className={erroresCita.hora ? 'shake' : ''}
                />
                {erroresCita.hora && (
                  <small className="error-msg">{erroresCita.hora}</small>
                )}
              </div>
            </div>

            <label>Tipo de consulta</label>
            <select
              id="consulta"
              value={formCita.consulta}
              onChange={(e) => setFormCita({...formCita, consulta: e.target.value})}
              className={erroresCita.consulta ? 'shake' : ''}
            >
              <option value="">Seleccione...</option>
              <option value="Limpieza dental">Limpieza dental</option>
              <option value="Extracción">Extracción</option>
              <option value="Ortodoncia">Ortodoncia</option>
              <option value="Endodoncia">Endodoncia</option>
              <option value="Revisión">Revisión</option>
            </select>
            {erroresCita.consulta && (
              <small className="error-msg">{erroresCita.consulta}</small>
            )}

            <label>Sexo</label>
            <select
              id="sexo"
              value={formCita.sexo}
              onChange={(e) => setFormCita({...formCita, sexo: e.target.value})}
              className={erroresCita.sexo ? 'shake' : ''}
            >
              <option value="">Seleccione...</option>
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
              <option value="Otro">Otro</option>
            </select>
            {erroresCita.sexo && (
              <small className="error-msg">{erroresCita.sexo}</small>
            )}

            <label>Edad</label>
            <input 
              type="number"
              id="edad"
              min="0"
              max="120"
              value={formCita.edad}
              onChange={(e) => setFormCita({...formCita, edad: e.target.value})}
              className={erroresCita.edad ? 'shake' : ''}
            />
            {erroresCita.edad && (
              <small className="error-msg">{erroresCita.edad}</small>
            )}

            <label>Teléfono</label>
            <input 
              type="text"
              id="telefono"
              placeholder="09xxxxxxxx"
              value={formCita.telefono}
              onChange={(e) => setFormCita({...formCita, telefono: e.target.value})}
              className={erroresCita.telefono ? 'shake' : ''}
            />
            {erroresCita.telefono && (
              <small className="error-msg">{erroresCita.telefono}</small>
            )}

            <label>Correo electrónico</label>
            <input 
              type="email"
              id="email"
              placeholder="correo@ejemplo.com"
              value={formCita.email}
              onChange={(e) => setFormCita({...formCita, email: e.target.value})}
              className={erroresCita.email ? 'shake' : ''}
            />
            {erroresCita.email && (
              <small className="error-msg">{erroresCita.email}</small>
            )}

            {/* ===== CHECKBOX PARA CONFIRMAR CITA ===== */}
            <div className="confirm-checkbox-container">
              <label className="confirm-checkbox-label">
                <input 
                  type="checkbox"
                  checked={formCita.estado === 'Confirmada'}
                  onChange={(e) => setFormCita({
                    ...formCita, 
                    estado: e.target.checked ? 'Confirmada' : 'Pendiente'
                  })}
                />
                <span className="confirm-checkbox-text">
                  <FontAwesomeIcon icon={faCheckCircle} className="confirm-icon" />
                  Confirmar cita y enviar a enfermería
                </span>
              </label>
              <small className="confirm-checkbox-hint">
                {formCita.estado === 'Confirmada' 
                  ? '✓ La cita se enviará automáticamente a enfermería' 
                  : 'La cita quedará como pendiente hasta que se confirme'}
              </small>
            </div>

            <button type="submit" className="submit-btn">
              {indiceEdicion !== null ? 'Actualizar cita' : 'Agendar cita'}
            </button>
          </form>
        </div>
      </div>

      {/* ===== MODAL CERRAR SESIÓN ===== */}
      <div
        id="logoutModal"
        className={`modal ${showLogoutModal ? "show" : ""}`}
      >
        <div className="modal-content logout-modal">
          <h2>¿Cerrar sesión?</h2>
          <p>¿Está seguro que desea cerrar su sesión?</p>

          <div className="button-row">
            <button
              className="cancel-btn"
              id="cancelLogout"
              onClick={() => setShowLogoutModal(false)}
            >
              Cancelar
            </button>

            <button 
              className="confirm-btn" 
              id="confirmLogout"
              onClick={handleLogout}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecepcionistaDashboard;