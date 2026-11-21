import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFaceSmile,
  faRightFromBracket,
  faCalendar,
  faFileMedical,
  faFloppyDisk,
  faFileLines,
  faFilePdf,
  faEraser,
  faBroom
} from '@fortawesome/free-solid-svg-icons';

import { useOdontologaLogic } from '../logic/OdontologaLogic';
import './odontologa.css';
import logoUleam from '../assets/logo-uleam.png';
import { cerrarSesion } from '../services/authService';

const OdontologaDashboard = () => {
  const navigate = useNavigate();

  // ===== IMPORTAR LÓGICA DEL HOOK =====
  const {
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
    dienteSeleccionadoParaLimpiar,
    setDienteSeleccionadoParaLimpiar,
    fechaHistorial,
    setFechaHistorial,
    errorFechaHistorial,
    showSuccessMessage,
    successMessage,
    handleGuardarDiagnostico,
    handleGenerarRecetaPDF,
    handleGenerarHistorialPDF,
    handleCambiarPaciente,
    handleClickDiente,
    handleLimpiarDiente,
    handleLimpiarTodoOdontograma,
    formatearFecha,
    getColorEstado
  } = useOdontologaLogic();

  // ===== ESTADOS LOCALES =====
  const [activeTab, setActiveTab] = useState('diagnostico');
  const [showRecetaModal, setShowRecetaModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ===== DATOS DE AGENDA DINÁMICA CON HORA REAL =====
  const agendaDia = pacientes.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    procedimiento: p.tratamiento || 'Consulta',
    hora: p.hora || '--:--', // Usa la hora real del paciente
    activo: p.id === pacienteActual?.id
  }));

  // ===== PROCEDIMIENTOS RÁPIDOS =====
  const procedimientosRapidos = [
    'Limpieza', 'Extracción', 'Resina', 'Corona', 'Endodoncia', 'Ortodoncia'
  ];

  // ===== DIENTES =====
  const dientesAdulto = [
    18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
    48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38
  ];

  const dientesNino = [
    55, 54, 53, 52, 51, 61, 62, 63, 64, 65,
    85, 84, 83, 82, 81, 71, 72, 73, 74, 75
  ];

  // ===== MANEJADORES =====
  const handleLogout = () => {
    cerrarSesion();
    localStorage.removeItem('odontologaData');
    navigate('/login-odontologa');
  };

  const onGuardarDiagnostico = (e) => {
    handleGuardarDiagnostico(e);
  };

  const handleGenerarReceta = () => {
    setShowRecetaModal(true);
  };

  const onGenerarRecetaPDF = () => {
    const success = handleGenerarRecetaPDF();
    if (success) {
      setShowRecetaModal(false);
    }
  };

  const handleProcedimientoRapido = (proc) => {
    setFormDiagnostico({ ...formDiagnostico, procedimiento: proc });
  };

  const onCambiarPaciente = (paciente) => {
    handleCambiarPaciente(paciente);
  };

  return (
    <div className="odonto-dashboard-scope">
      {/* Toast de mensaje de éxito */}
      {showSuccessMessage && (
        <div className="odonto-toast-bienvenida">{successMessage}</div>
      )}

      {/* Logo */}
      <img
        src={logoUleam}
        alt="Logo"
        className="logo-image" 
      />
      {/* Header */}
      <header className="odonto-header">
        <div className="odonto-header-left">
          <div className="odonto-icon-circle">
            <FontAwesomeIcon icon={faFaceSmile} />
          </div>
          <div>
            <h1>Odontóloga</h1>
            <p>Diagnóstico y tratamiento</p>
          </div>
        </div>
        <div className="odonto-header-right">
          <a 
            href="#" 
            className="odonto-logout-link"
            onClick={(e) => {
              e.preventDefault();
              setShowLogoutModal(true);
            }}
          >
            <FontAwesomeIcon icon={faRightFromBracket} /> Cerrar sesión
          </a>
        </div>
      </header>

      <main className="odonto-container">
        {/* Sección izquierda */}
        <section className="odonto-consulta">
          <div className="odonto-consulta-header">
            <h2>
              <FontAwesomeIcon icon={faFaceSmile} /> Consulta actual
            </h2>
            <p id="odonto-paciente-nombre">
              Paciente: {pacienteActual?.nombre || 'Seleccione un paciente'}
            </p>
          </div>

          {/* Pestañas */}
          <div className="odonto-tabs">
            <button 
              className={`odonto-tab ${activeTab === 'diagnostico' ? 'odonto-active' : ''}`}
              onClick={() => setActiveTab('diagnostico')}
            >
              Diagnóstico
            </button>
            <button 
              className={`odonto-tab ${activeTab === 'odontograma' ? 'odonto-active' : ''}`}
              onClick={() => setActiveTab('odontograma')}
            >
              Odontograma
            </button>
            <button 
              className={`odonto-tab ${activeTab === 'historial' ? 'odonto-active' : ''}`}
              onClick={() => setActiveTab('historial')}
            >
              Historial
            </button>
          </div>

          {/* CONTENIDO: DIAGNÓSTICO */}
          {activeTab === 'diagnostico' && (
            <div className="odonto-tab-content odonto-active" id="odonto-diagnostico-tab">
              {pacienteActual ? (
                <>
                  <div className="odonto-info-box">
                    <div><strong>Edad:</strong> {pacienteActual.edad}</div>
                    <div><strong>Última visita:</strong> {pacienteActual.ultimaVisita}</div>
                    <div>
                      <strong>Alergias:</strong> 
                      <span className="odonto-badge">{pacienteActual.alergias}</span>
                    </div>
                  </div>

                  <form onSubmit={onGuardarDiagnostico}>
                    <label>Diagnóstico actual</label>
                    <textarea 
                      placeholder="Escriba el diagnóstico del paciente..."
                      value={formDiagnostico.diagnostico}
                      onChange={(e) => setFormDiagnostico({
                        ...formDiagnostico, 
                        diagnostico: e.target.value
                      })}
                      className={erroresDiagnostico.diagnostico ? 'odonto-error-input' : ''}
                    />
                    {erroresDiagnostico.diagnostico && (
                      <small className="odonto-error-msg">{erroresDiagnostico.diagnostico}</small>
                    )}

                    <div className="odonto-form-row">
                      <div>
                        <label>Diente/Pieza</label>
                        <input 
                          type="text" 
                          placeholder="Ej: 16, 11, 26"
                          value={formDiagnostico.diente}
                          onChange={(e) => setFormDiagnostico({
                            ...formDiagnostico, 
                            diente: e.target.value
                          })}
                          className={erroresDiagnostico.diente ? 'odonto-error-input' : ''}
                        />
                        {erroresDiagnostico.diente && (
                          <small className="odonto-error-msg">{erroresDiagnostico.diente}</small>
                        )}
                      </div>
                      <div>
                        <label>Procedimiento</label>
                        <select 
                          id="odonto-procedimiento"
                          value={formDiagnostico.procedimiento}
                          onChange={(e) => setFormDiagnostico({
                            ...formDiagnostico, 
                            procedimiento: e.target.value
                          })}
                          className={erroresDiagnostico.procedimiento ? 'odonto-error-input' : ''}
                        >
                          <option>Limpieza</option>
                          <option>Extracción</option>
                          <option>Endodoncia</option>
                          <option>Corona</option>
                          <option>Resina</option>
                          <option>Ortodoncia</option>
                        </select>
                        {erroresDiagnostico.procedimiento && (
                          <small className="odonto-error-msg">{erroresDiagnostico.procedimiento}</small>
                        )}
                      </div>
                    </div>

                    <label>Notas clínicas</label>
                    <textarea 
                      placeholder="Observaciones y notas adicionales..."
                      value={formDiagnostico.notas}
                      onChange={(e) => setFormDiagnostico({
                        ...formDiagnostico, 
                        notas: e.target.value
                      })}
                      className={erroresDiagnostico.notas ? 'odonto-error-input' : ''}
                    />
                    {erroresDiagnostico.notas && (
                      <small className="odonto-error-msg">{erroresDiagnostico.notas}</small>
                    )}

                    <div className="odonto-buttons">
                      <button type="submit" className="odonto-save-btn">
                        <FontAwesomeIcon icon={faFloppyDisk} /> Guardar diagnóstico
                      </button>
                      <button 
                        type="button" 
                        className="odonto-receta-btn" 
                        onClick={handleGenerarReceta}
                      >
                        <FontAwesomeIcon icon={faFileLines} /> Generar receta
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <p style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Seleccione un paciente de la agenda para iniciar la consulta
                </p>
              )}
            </div>
          )}

          {/* CONTENIDO: ODONTOGRAMA */}
          {activeTab === 'odontograma' && (
            <div className="odonto-tab-content odonto-active" id="odonto-odontograma-tab">
              <div className="odonto-odontograma-contenedor">
                {/* Modo selector */}
                <div className="odonto-modo-selector">
                  <label>Adulto</label>
                  <label className="odonto-switch">
                    <input 
                      type="checkbox" 
                      id="odonto-modoToggle"
                      checked={!modoAdulto}
                      onChange={() => setModoAdulto(!modoAdulto)}
                    />
                    <span className="odonto-slider"></span>
                  </label>
                  <label>Niño (Dentición temporal)</label>
                </div>

                {/* Odontograma de dientes */}
                <div id="odonto-odontograma-dientes" className="odonto-odontograma-dientes">
                  {/* Superior */}
                  <div className="odonto-fila-dientes odonto-superior">
                    {(modoAdulto ? dientesAdulto.slice(0, 16) : dientesNino.slice(0, 10)).map((num) => (
                      <div 
                        key={num}
                        className={`odonto-diente ${dienteSeleccionadoParaLimpiar === num ? 'odonto-diente-seleccionado' : ''}`}
                        style={{ backgroundColor: getColorEstado(estadosDientes[num]) }}
                        onClick={() => handleClickDiente(num)}
                      >
                        {num}
                      </div>
                    ))}
                  </div>

                  {/* Inferior */}
                  <div className="odonto-fila-dientes odonto-inferior">
                    {(modoAdulto ? dientesAdulto.slice(16) : dientesNino.slice(10)).map((num) => (
                      <div 
                        key={num}
                        className={`odonto-diente ${dienteSeleccionadoParaLimpiar === num ? 'odonto-diente-seleccionado' : ''}`}
                        style={{ backgroundColor: getColorEstado(estadosDientes[num]) }}
                        onClick={() => handleClickDiente(num)}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selector de estados */}
                <div className="odonto-estado-selector">
                  <p>Selecciona un estado y haz clic en los dientes:</p>
                  <br />
                  <div className="odonto-estados">
                    <button 
                      className={`odonto-estado ${estadoSeleccionado === 'sano' ? 'odonto-activo' : ''}`}
                      onClick={() => setEstadoSeleccionado('sano')}
                    >
                      🟢 Sano
                    </button>
                    <button 
                      className={`odonto-estado ${estadoSeleccionado === 'caries' ? 'odonto-activo' : ''}`}
                      onClick={() => setEstadoSeleccionado('caries')}
                    >
                      🔴 Caries
                    </button>
                    <button 
                      className={`odonto-estado ${estadoSeleccionado === 'tratado' ? 'odonto-activo' : ''}`}
                      onClick={() => setEstadoSeleccionado('tratado')}
                    >
                      🔵 Tratado
                    </button>
                    <button 
                      className={`odonto-estado ${estadoSeleccionado === 'observacion' ? 'odonto-activo' : ''}`}
                      onClick={() => setEstadoSeleccionado('observacion')}
                    >
                      🟡 Observación
                    </button>
                    <button 
                      className={`odonto-estado ${estadoSeleccionado === 'ausente' ? 'odonto-activo' : ''}`}
                      onClick={() => setEstadoSeleccionado('ausente')}
                    >
                      ⚫ Ausente
                    </button>
                  </div>

                  {/* Botones de limpiar */}
                  <div className="odonto-limpiar-botones">
                    <button 
                      className="odonto-btn-limpiar-diente"
                      onClick={handleLimpiarDiente}
                      disabled={!dienteSeleccionadoParaLimpiar}
                      title={dienteSeleccionadoParaLimpiar 
                        ? `Limpiar diente ${dienteSeleccionadoParaLimpiar}` 
                        : 'Selecciona un diente primero'}
                    >
                      <FontAwesomeIcon icon={faEraser} /> 
                      {dienteSeleccionadoParaLimpiar 
                        ? `Limpiar diente ${dienteSeleccionadoParaLimpiar}` 
                        : 'Selecciona un diente'}
                    </button>
                    <button 
                      className="odonto-btn-limpiar-todo"
                      onClick={handleLimpiarTodoOdontograma}
                    >
                      <FontAwesomeIcon icon={faBroom} /> Limpiar todo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONTENIDO: HISTORIAL */}
          {activeTab === 'historial' && (
            <div className="odonto-tab-content odonto-active" id="odonto-historial-tab">
              <h3>
                <FontAwesomeIcon icon={faFileMedical} /> Historial clínico del paciente
              </h3>

              <table className="odonto-tabla-historial">
                <thead>
                  <tr>
                    <th>Diente</th>
                    <th>Procedimiento</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historialClinico.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                        No hay registros en el historial
                      </td>
                    </tr>
                  ) : (
                    historialClinico.map((registro) => (
                      <tr key={registro.id}>
                        <td>{registro.diente}</td>
                        <td>{registro.procedimiento}</td>
                        <td>{registro.fecha}</td>
                        <td>
                          <span className={`odonto-estado odonto-${registro.estado}`}>
                            {registro.estado === 'completado' && 'Completado'}
                            {registro.estado === 'proceso' && 'En Proceso'}
                            {registro.estado === 'pendiente' && 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="odonto-generar-historial">
                <label htmlFor="odonto-fechaSeleccion">Selecciona la fecha (DD/MM/YYYY):</label>
                <input 
                  type="text" 
                  id="odonto-fechaSeleccion" 
                  placeholder="DD/MM/YYYY"
                  value={fechaHistorial}
                  onChange={(e) => setFechaHistorial(formatearFecha(e.target.value))}
                  className={errorFechaHistorial ? 'odonto-error-input' : ''}
                />
                {errorFechaHistorial && (
                  <small className="odonto-error-msg">{errorFechaHistorial}</small>
                )}
                <button id="odonto-btnHistorial" onClick={handleGenerarHistorialPDF}>
                  <FontAwesomeIcon icon={faFilePdf} /> Generar historial clínico
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Panel derecho */}
        <aside className="odonto-sidebar">
          <div className="odonto-agenda">
            <h3>
              <FontAwesomeIcon icon={faCalendar} /> Agenda del Día
            </h3>
            <br />
            {agendaDia.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
                No hay pacientes en agenda
              </p>
            ) : (
              agendaDia.map((cita) => (
                <div 
                  key={cita.id} 
                  className={`odonto-agenda-item ${cita.activo ? 'odonto-active' : ''}`}
                  onClick={() => onCambiarPaciente(pacientes.find(p => p.id === cita.id))}
                  style={{ cursor: 'pointer' }}
                >
                  <strong>{cita.nombre}</strong>
                  <p>
                    {cita.procedimiento} <span className="odonto-hora">{cita.hora}</span>
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="odonto-procedimientos">
            <h3>Procedimientos Rápidos</h3>
            <p>Haz clic para auto-rellenar</p>
            <br />
            <div className="odonto-grid-buttons">
              {procedimientosRapidos.map((proc, index) => (
                <button 
                  key={index}
                  className={formDiagnostico.procedimiento === proc ? 'odonto-active' : ''}
                  onClick={() => handleProcedimientoRapido(proc)}
                >
                  {proc}
                </button>
              ))}
            </div>
          </div>

          <div className="odonto-stats">
            <h3>Estadísticas</h3>
            <p>Pacientes hoy: <span>{pacientes.length}</span></p>
            <p>Tratamientos activos: <span>{historialClinico.length}</span></p>
          </div>
        </aside>
      </main>

      {/* MODAL DE RECETA MÉDICA */}
      {showRecetaModal && (
        <div className="odonto-modal-receta">
          <div className="odonto-modal-contenido">
            <span 
              className="odonto-cerrar-modal"
              onClick={() => setShowRecetaModal(false)}
            >
              &times;
            </span>
            <h2>Receta Médica</h2>
            <p>Paciente: <strong>{pacienteActual?.nombre || 'Sin paciente'}</strong></p>

            <label>Medicamento</label>
            <input 
              type="text" 
              id="odonto-medicamento" 
              placeholder="Nombre del medicamento"
              value={formReceta.medicamento}
              onChange={(e) => setFormReceta({...formReceta, medicamento: e.target.value})}
              className={erroresReceta.medicamento ? 'odonto-error-input' : ''}
            />
            {erroresReceta.medicamento && (
              <small className="odonto-error-msg">{erroresReceta.medicamento}</small>
            )}

            <div className="odonto-form-row">
              <div>
                <label>Dosis</label>
                <input 
                  type="text" 
                  id="odonto-dosis" 
                  placeholder="Ej: 500mg"
                  value={formReceta.dosis}
                  onChange={(e) => setFormReceta({...formReceta, dosis: e.target.value})}
                  className={erroresReceta.dosis ? 'odonto-error-input' : ''}
                />
                {erroresReceta.dosis && (
                  <small className="odonto-error-msg">{erroresReceta.dosis}</small>
                )}
              </div>
              <div>
                <label>Frecuencia</label>
                <input 
                  type="text" 
                  id="odonto-frecuencia" 
                  placeholder="Ej: Cada 8 horas"
                  value={formReceta.frecuencia}
                  onChange={(e) => setFormReceta({...formReceta, frecuencia: e.target.value})}
                  className={erroresReceta.frecuencia ? 'odonto-error-input' : ''}
                />
                {erroresReceta.frecuencia && (
                  <small className="odonto-error-msg">{erroresReceta.frecuencia}</small>
                )}
              </div>
            </div>

            <label>Duración</label>
            <input 
              type="text" 
              id="odonto-duracion" 
              placeholder="Ej: 7 días"
              value={formReceta.duracion}
              onChange={(e) => setFormReceta({...formReceta, duracion: e.target.value})}
              className={erroresReceta.duracion ? 'odonto-error-input' : ''}
            />
            {erroresReceta.duracion && (
              <small className="odonto-error-msg">{erroresReceta.duracion}</small>
            )}

            <label>Indicaciones</label>
            <textarea 
              id="odonto-indicaciones" 
              placeholder="Instrucciones adicionales..."
              value={formReceta.indicaciones}
              onChange={(e) => setFormReceta({...formReceta, indicaciones: e.target.value})}
            />

            <button id="odonto-btnGenerarRecetaPDF" onClick={onGenerarRecetaPDF}>
              <FontAwesomeIcon icon={faFilePdf} /> Generar Receta
            </button>
          </div>
        </div>
      )}

      {/* MODAL CERRAR SESIÓN */}
      {showLogoutModal && (
        <div className="odonto-logout-modal-container">
          <div className="odonto-logout-modal">
            <h2>¿Cerrar sesión?</h2>
            <p>
              ¿Está seguro que desea cerrar su sesión? Tendrá que iniciar sesión 
              nuevamente para acceder al sistema.
            </p>
            <div className="odonto-logout-buttons">
              <button 
                className="odonto-btn-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancelar
              </button>
              <button className="odonto-btn-logout" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OdontologaDashboard;