// ==================== VALIDACIONES COMPARTIDAS ====================
// Funciones puras: reciben el valor y devuelven el mensaje de error ('' si es válido).
// Se pueden reutilizar tal cual en un backend con Node.

/** Recibe el valor del campo y devuelve el mensaje de error ('' si es válido) */
export type Validador = (valor: unknown) => string;

export const requerido = (valor: unknown, mensaje = 'Este campo es obligatorio.'): string =>
  String(valor ?? '').trim() ? '' : mensaje;

export const validarCedula = (valor: unknown): string => {
  const cedula = String(valor).trim();
  if (!/^\d{10}$/.test(cedula)) return 'Ingrese una cédula válida (10 dígitos).';
  // Las dos primeras cifras son la provincia (01-24, o 30 para ecuatorianos en el exterior)
  const provincia = Number(cedula.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) {
    return 'Los dos primeros dígitos no corresponden a una provincia.';
  }
  return '';
};

export const validarNombre = (valor: unknown): string => {
  const nombre = String(valor).trim();
  if (!/^[a-zA-ZÁÉÍÓÚáéíóúÜüñÑ ]+$/.test(nombre)) return 'Solo se permiten letras y espacios.';
  if (nombre.split(/\s+/).length < 2) return 'Ingrese nombre y apellido.';
  return '';
};

export const validarTelefono = (valor: unknown): string =>
  /^09\d{8}$/.test(String(valor).trim()) ? '' : 'Formato: 09xxxxxxxx (10 dígitos).';

export const validarEdad = (valor: unknown): string => {
  const edad = Number(valor);
  return Number.isInteger(edad) && edad >= 0 && edad <= 120 ? '' : 'Ingrese una edad válida (0-120).';
};

export const validarEmail = (valor: unknown): string =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor).trim()) ? '' : 'Formato de correo inválido.';

export const validarPresion = (valor: unknown): string =>
  /^\d{2,3}\/\d{2,3}$/.test(String(valor).trim()) ? '' : 'Formato incorrecto (ej.: 120/80).';

export const validarRango = (valor: unknown, min: number, max: number, unidad: string): string => {
  const numero = Number(valor);
  return !Number.isNaN(numero) && numero >= min && numero <= max
    ? ''
    : `Fuera de rango (${min}-${max} ${unidad}).`;
};

/**
 * Aplica reglas a un formulario.
 * reglas = { campo: [validador1, validador2, ...] }
 * Se detiene en el primer error de cada campo. Devuelve { campo: mensaje }.
 */
export const validarFormulario = (
  valores: object,
  reglas: Record<string, Validador[]>,
): Record<string, string> => {
  const datos = valores as Record<string, unknown>;
  const errores: Record<string, string> = {};
  Object.entries(reglas).forEach(([campo, validadores]) => {
    for (const validar of validadores) {
      const error = validar(datos[campo] ?? '');
      if (error) {
        errores[campo] = error;
        break;
      }
    }
  });
  return errores;
};

const validarParteNombre = (campo: string): Validador => (valor) => {
  const v = String(valor).trim();
  if (v.length < 2) return `${campo}: mínimo 2 letras.`;
  if (!/^[a-zA-ZÁÉÍÓÚáéíóúÜüñÑ' ]+$/.test(v)) return 'Solo se permiten letras y espacios.';
  return '';
};

export const validarFechaNacimiento = (valor: unknown): string => {
  const fecha = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(fecha.getTime())) return 'Fecha inválida.';
  if (fecha > new Date()) return 'No puede ser una fecha futura.';
  if (fecha.getFullYear() < new Date().getFullYear() - 120) return 'Revise el año.';
  return '';
};

const opcional = (validar: Validador): Validador => (valor) => (String(valor ?? '').trim() ? validar(valor) : '');

// Reglas del paciente (las mismas que valida el servidor)
export const reglasPaciente: Record<string, Validador[]> = {
  cedula: [requerido, validarCedula],
  nombres: [requerido, validarParteNombre('Nombres')],
  apellidos: [requerido, validarParteNombre('Apellidos')],
  fechaNacimiento: [requerido, validarFechaNacimiento],
  sexo: [(v) => requerido(v, 'Seleccione una opción.')],
  telefono: [requerido, validarTelefono],
  correo: [opcional(validarEmail)],
  contactoEmergenciaNombre: [opcional(validarNombre)],
  contactoEmergenciaTelefono: [opcional((v) => (/^0\d{8,9}$/.test(String(v)) ? '' : 'Teléfono inválido (ej.: 0991234567).'))],
};

/** Mismas reglas que exige el servidor para una contraseña nueva */
export const validarPasswordNueva = (valor: unknown): string => {
  const v = String(valor);
  if (v.length < 8) return 'Mínimo 8 caracteres.';
  if (v.length > 72) return 'Máximo 72 caracteres.';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(v)) return 'Debe tener al menos una letra.';
  if (!/\d/.test(v)) return 'Debe tener al menos un número.';
  return '';
};
