import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faStethoscope, faRightFromBracket, faHeartPulse, faMagnifyingGlass, 
  faCircleInfo, faWaveSquare, faTemperatureHalf, faCircleExclamation,
  faNotesMedical, faTriangleExclamation, faHeart, faCheckCircle, faXmark,
  faCheck, faEye
} from '@fortawesome/free-solid-svg-icons';
import { faClock, faUser, faIdCard, faClipboard } from '@fortawesome/free-regular-svg-icons';

import { useEnfermeraLogic } from '../logic/EnfermeraLogic';
import './enfermera.css';
import logoUleam from '../assets/logo-uleam.png';
import { cerrarSesion } from '../services/authService';

const EnfermeraDashboard = () => {
  const navigate = useNavigate();

  // Hook de lógica
  const {
    pacientesEspera,
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
    prepararPaciente,
    handleGuardarSignos,
    resetFormSignos,
    formatearPresion,
    formatearNumerico,
    obtenerFechaActual
  } = useEnfermeraLogic();

  // Estados locales
  const [activeTab, setActiveTab] = useState('espera');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detallesPaciente, setDetallesPaciente] = useState(null);

  // Cerrar sesión
  const handleLogout = () => {
    cerrarSesion();
    localStorage.removeItem('enfermeraData');
    navigate('/login-enfermera');
  };

  // Preparar paciente y cambiar a tab signos
  const onPrepararPaciente = (paciente) => {
    prepararPaciente(paciente);
    setActiveTab('signos');
  };

  // Guardar signos y volver a espera
  const onGuardarSignos = (e) => {
    const success = handleGuardarSignos(e);
    if (success) {
      setTimeout(() => {
        setActiveTab('espera');
      }, 2800);
    }
  };

  // Ver detalles de paciente preparado
  const verDetalles = (paciente) => {
    setDetallesPaciente(paciente);
    setShowDetailsModal(true);
  };

  return (
    <div className="enf-dashboard-scope">
      {/* Toast de mensaje de éxito */}
      {showSuccessMessage && (
        <div className="enf-toast-bienvenida">{successMessage}</div>
      )}

      {/* Logo */}
      <img
        src={logoUleam}
        alt="Logo"
        className="logo-image" 
      />

      {/* Header */}
      <header className="enf-header enf-centered">
        <div className="enf-header-left">
          <div className="enf-header-icon">
            <div className="enf-icon-circle enf-green">
              <FontAwesomeIcon icon={faStethoscope} />
            </div>
          </div>
          <div className="enf-header-info">
            <h1>Enfermera</h1>
            <p>Preparación de pacientes</p>
          </div>
        </div>
        <div className="enf-header-right">
          <button 
            className="enf-logout-link-btn" 
            onClick={() => setShowLogoutModal(true)}
          >
            <FontAwesomeIcon icon={faRightFromBracket} /> Cerrar sesión
          </button>
        </div>
      </header>

      <main className="enf-main-content">
        <section className="enf-patients-section">
          <h2>
            <FontAwesomeIcon icon={faHeartPulse} /> Preparación de pacientes
          </h2>
          <br />
          <p>Lista de espera y registro de signos vitales</p>
          <br />

          {/* Buscador */}
          <div className="enf-search-bar">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input 
              type="text" 
              placeholder="Buscar paciente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <div className="enf-tabs">
            <button 
              className={`enf-tab ${activeTab === 'espera' ? 'enf-active' : ''}`} 
              onClick={() => setActiveTab('espera')}
            >
              Sala de espera
            </button>
            <button 
              className={`enf-tab ${activeTab === 'signos' ? 'enf-active' : ''}`} 
              onClick={() => setActiveTab('signos')}
            >
              Signos vitales
            </button>
          </div>

          {/* CONTENIDO: SALA DE ESPERA */}
          {activeTab === 'espera' && (
            <div className="enf-tab-content enf-active">
              <table className="enf-patients-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Paciente</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesEspera.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                        No hay pacientes en espera
                      </td>
                    </tr>
                  ) : (
                    pacientesEspera.map((paciente) => (
                      <tr key={paciente.id}>
                        <td>
                          <FontAwesomeIcon icon={faClock} /> {paciente.hora}
                        </td>
                        <td>
                          <FontAwesomeIcon icon={faUser} /> {paciente.paciente}
                        </td>
                        <td className="enf-estado">
                          <span className="enf-badge enf-pending">En espera</span>
                        </td>
                        <td>
                          <button 
                            className="enf-prepare-btn" 
                            onClick={() => onPrepararPaciente(paciente)}
                          >
                            <FontAwesomeIcon icon={faStethoscope} /> Preparar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Mostrar pacientes preparados */}
                  {pacientesPreparados.map((paciente) => (
                    <tr key={`preparado-${paciente.id}`}>
                      <td>
                        <FontAwesomeIcon icon={faClock} /> {paciente.hora}
                      </td>
                      <td>
                        <FontAwesomeIcon icon={faUser} /> {paciente.paciente}
                      </td>
                      <td className="enf-estado">
                        <span className="enf-badge enf-success">
                          <FontAwesomeIcon icon={faCheck} /> Preparado
                        </span>
                      </td>
                      <td>
                        <button 
                          className="enf-details-btn"
                          onClick={() => verDetalles(paciente)}
                        >
                          <FontAwesomeIcon icon={faEye} /> Ver Detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CONTENIDO: SIGNOS VITALES */}
          {activeTab === 'signos' && (
            <div className="enf-tab-content enf-active">
              {!pacienteSeleccionado ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p>Seleccione un paciente para registrar signos vitales</p>
                </div>
              ) : (
                <>
                  <div className="enf-vital-instructions">
                    <FontAwesomeIcon icon={faCircleInfo} />
                    Registre los signos vitales de <strong>{pacienteSeleccionado.paciente}</strong> antes de pasar con la odontóloga.
                  </div>

                  <form onSubmit={onGuardarSignos}>
                    <div className="enf-vital-inputs">
                      <div className="enf-vital-field">
                        <FontAwesomeIcon icon={faHeartPulse} />
                        <label>Presión arterial</label>
                        <input 
                          type="text" 
                          placeholder="Ej: 120/80 mmHg"
                          value={formSignos.presion}
                          onChange={(e) => setFormSignos({
                            ...formSignos, 
                            presion: formatearPresion(e.target.value)
                          })}
                          className={erroresSignos.presion ? 'enf-shake' : ''}
                        />
                        {erroresSignos.presion && (
                          <small className="enf-error-message">
                            {erroresSignos.presion}
                          </small>
                        )}
                      </div>

                      <div className="enf-vital-field">
                        <FontAwesomeIcon icon={faWaveSquare} />
                        <label>Pulso</label>
                        <input 
                          type="text" 
                          placeholder="Ej: 70 bpm"
                          value={formSignos.pulso}
                          onChange={(e) => setFormSignos({
                            ...formSignos, 
                            pulso: formatearNumerico(e.target.value)
                          })}
                          className={erroresSignos.pulso ? 'enf-shake' : ''}
                        />
                        {erroresSignos.pulso && (
                          <small className="enf-error-message">
                            {erroresSignos.pulso}
                          </small>
                        )}
                      </div>

                      <div className="enf-vital-field">
                        <FontAwesomeIcon icon={faTemperatureHalf} />
                        <label>Temperatura</label>
                        <input 
                          type="text" 
                          placeholder="Ej: 36.5°C"
                          value={formSignos.temperatura}
                          onChange={(e) => setFormSignos({
                            ...formSignos, 
                            temperatura: formatearNumerico(e.target.value)
                          })}
                          className={erroresSignos.temperatura ? 'enf-shake' : ''}
                        />
                        {erroresSignos.temperatura && (
                          <small className="enf-error-message">
                            {erroresSignos.temperatura}
                          </small>
                        )}
                      </div>
                    </div>

                    <label>Observaciones</label>
                    <textarea 
                      className="enf-textarea"
                      placeholder="Notas adicionales sobre el paciente..."
                      value={formSignos.observaciones}
                      onChange={(e) => setFormSignos({
                        ...formSignos, 
                        observaciones: e.target.value
                      })}
                    />

                    <button type="submit" className="enf-save-btn">
                      Guardar y marcar como preparado
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </section>

        {/* Alertas Médicas */}
        <section className="enf-side-section">
          <div className="enf-alerts">
            <h3>
              <FontAwesomeIcon icon={faCircleExclamation} /> Alertas médicas
            </h3>
            {alertasMedicas.length === 0 ? (
              <p className="enf-no-alerts">
                {pacienteSeleccionado 
                  ? 'No hay alertas para este paciente' 
                  : 'Seleccione un paciente para ver alertas'}
              </p>
            ) : (
              alertasMedicas.map((alerta) => (
                <div key={alerta.id} className="enf-alert-box enf-red">
                  <strong>{alerta.paciente}</strong>
                  <p>{alerta.descripcion}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Historial */}
        <section className="enf-history">
          <h3>Historial de pacientes atendidos</h3>
          <br />
          <p>Últimas atenciones realizadas</p>
          <table className="enf-history-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Fecha</th>
                <th>Tratamiento</th>
                <th>Alergias/Notas</th>
              </tr>
            </thead>
            <tbody>
              {historialAtenciones.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center' }}>
                    Sin historial
                  </td>
                </tr>
              ) : (
                historialAtenciones.map((atencion) => (
                  <tr key={atencion.id}>
                    <td>{atencion.paciente}</td>
                    <td>{atencion.fecha}</td>
                    <td>{atencion.tratamiento}</td>
                    <td style={{
                      color: /alerg/i.test(atencion.observaciones) ? 'red' : 'inherit',
                      fontWeight: /alerg/i.test(atencion.observaciones) ? '600' : 'normal'
                    }}>
                      {atencion.observaciones}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>

      {/* MODAL DETALLES PACIENTE */}
      {showDetailsModal && detallesPaciente && (
        <div className="enf-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="enf-details-content" onClick={(e) => e.stopPropagation()}>
            <div className="enf-modal-header">
              <h2>
                <FontAwesomeIcon icon={faNotesMedical} /> Detalles del paciente preparado
              </h2>
              <button 
                className="enf-close-modal"
                onClick={() => setShowDetailsModal(false)}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <p className="enf-details-subtitle">
              Información completa del paciente listo para consulta
            </p>

            <div className="enf-details-section enf-personal">
              <h3>
                <FontAwesomeIcon icon={faIdCard} /> Información personal
              </h3>
              <br />
              <div className="enf-details-box">
                <p>
                  <strong>Nombre:</strong> 
                  <span>{detallesPaciente.paciente}</span>
                </p>
                <p>
                  <strong>Edad:</strong> 
                  <span>{detallesPaciente.edad}</span>
                </p>
                <p>
                  <strong>Hora de Cita:</strong> 
                  <span>{detallesPaciente.hora}</span>
                </p>
              </div>
            </div>

            <div className="enf-details-section">
              <h3>
                <FontAwesomeIcon icon={faTriangleExclamation} /> Alergias y alertas médicas
              </h3>
              <br />
              <p className="enf-details-alert">
                {/alerg/i.test(detallesPaciente.signosVitales?.observaciones || '')
                  ? detallesPaciente.signosVitales.observaciones
                  : 'Ninguna'}
              </p>
            </div>

            <div className="enf-details-section">
              <h3>
                <FontAwesomeIcon icon={faHeartPulse} /> Signos Vitales registrados
              </h3>
              <br />
              <div className="enf-vitals-grid">
                <div className="enf-vital-card">
                  <FontAwesomeIcon icon={faHeart} />
                  <p>Presión arterial</p>
                  <span>{detallesPaciente.signosVitales?.presion || '--'}</span>
                </div>
                <div className="enf-vital-card">
                  <FontAwesomeIcon icon={faWaveSquare} />
                  <p>Pulso</p>
                  <span>{detallesPaciente.signosVitales?.pulso || '--'}</span>
                </div>
                <div className="enf-vital-card">
                  <FontAwesomeIcon icon={faTemperatureHalf} />
                  <p>Temperatura</p>
                  <span>{detallesPaciente.signosVitales?.temperatura || '--'}</span>
                </div>
              </div>
            </div>

            <div className="enf-details-section">
              <h3>
                <FontAwesomeIcon icon={faClipboard} /> Observaciones
              </h3>
              <br />
              <p className="enf-obs-text">
                {detallesPaciente.signosVitales?.observaciones || 'Sin observaciones'}
              </p>
            </div>

            <div className="enf-details-final">
              <FontAwesomeIcon icon={faCheckCircle} /> Paciente preparado y listo para consulta.
            </div>
          </div>
        </div>
      )}

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


export default EnfermeraDashboard;