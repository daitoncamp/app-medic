// ==================== VALIDACIONES COMPARTIDAS ====================
// Funciones puras: reciben el valor y devuelven el mensaje de error ('' si es válido).
// Se pueden reutilizar tal cual en un backend con Node.

export const requerido = (valor, mensaje = 'Este campo es obligatorio.') =>
  String(valor ?? '').trim() ? '' : mensaje;

export const validarCedula = (valor) => {
  const cedula = String(valor).trim();
  if (!/^\d{10}$/.test(cedula)) return 'Ingrese una cédula válida (10 dígitos).';
  // Las dos primeras cifras son la provincia (01-24, o 30 para ecuatorianos en el exterior)
  const provincia = Number(cedula.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) {
    return 'Los dos primeros dígitos no corresponden a una provincia.';
  }
  return '';
};

export const validarNombre = (valor) => {
  const nombre = String(valor).trim();
  if (!/^[a-zA-ZÁÉÍÓÚáéíóúÜüñÑ ]+$/.test(nombre)) return 'Solo se permiten letras y espacios.';
  if (nombre.split(/\s+/).length < 2) return 'Ingrese nombre y apellido.';
  return '';
};

export const validarTelefono = (valor) =>
  /^09\d{8}$/.test(String(valor).trim()) ? '' : 'Formato: 09xxxxxxxx (10 dígitos).';

export const validarEdad = (valor) => {
  const edad = Number(valor);
  return Number.isInteger(edad) && edad >= 0 && edad <= 120 ? '' : 'Ingrese una edad válida (0-120).';
};

export const validarEmail = (valor) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor).trim()) ? '' : 'Formato de correo inválido.';

export const validarPresion = (valor) =>
  /^\d{2,3}\/\d{2,3}$/.test(String(valor).trim()) ? '' : 'Formato incorrecto (ej.: 120/80).';

export const validarRango = (valor, min, max, unidad) => {
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
export const validarFormulario = (valores, reglas) => {
  const errores = {};
  Object.entries(reglas).forEach(([campo, validadores]) => {
    for (const validar of validadores) {
      const error = validar(valores[campo] ?? '');
      if (error) {
        errores[campo] = error;
        break;
      }
    }
  });
  return errores;
};

// Reglas reutilizadas por varios formularios
export const reglasPaciente = {
  cedula: [requerido, validarCedula],
  nombre: [requerido, validarNombre],
  sexo: [(v) => requerido(v, 'Seleccione una opción.')],
  edad: [requerido, validarEdad],
  telefono: [requerido, validarTelefono],
  correo: [requerido, validarEmail],
};

/** Mismas reglas que exige el servidor para una contraseña nueva */
export const validarPasswordNueva = (valor) => {
  const v = String(valor);
  if (v.length < 8) return 'Mínimo 8 caracteres.';
  if (v.length > 72) return 'Máximo 72 caracteres.';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(v)) return 'Debe tener al menos una letra.';
  if (!/\d/.test(v)) return 'Debe tener al menos un número.';
  return '';
};
