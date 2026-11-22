// Valores del formulario de paciente

export const PACIENTE_VACIO = {
  cedula: '',
  nombres: '',
  apellidos: '',
  fechaNacimiento: '',
  sexo: '',
  telefono: '',
  correo: '',
  contactoEmergenciaNombre: '',
  contactoEmergenciaTelefono: '',
};

/** Copia al formulario los datos de un paciente existente */
export const pacienteAFormulario = (p) => ({
  cedula: p.cedula || '',
  nombres: p.nombres || '',
  apellidos: p.apellidos || '',
  fechaNacimiento: p.fechaNacimiento || '',
  sexo: p.sexo || '',
  telefono: p.telefono || '',
  correo: p.correo || '',
  contactoEmergenciaNombre: p.contactoEmergenciaNombre || '',
  contactoEmergenciaTelefono: p.contactoEmergenciaTelefono || '',
});
