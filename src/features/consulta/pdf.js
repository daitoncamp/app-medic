// ==================== DOCUMENTOS PDF DE LA CONSULTA ====================
// Receta médica e historial clínico en A4 (medidas en milímetros).

import { jsPDF } from 'jspdf';
import logoUleam from '../../assets/logo-uleam.png';
import { fechaLocalISO } from '../../services/clinica';
import { aFecha, formatearFecha, formatearFechaHora } from '../../utils/formato';
import { DIENTES, ESTADOS_DIENTE, estadoDiente, tipoDiente } from './dientes';

const ODONTOLOGA = 'Dra. María Fernanda López';

// ===== Medidas de la hoja =====
const ANCHO = 210;
const ALTO = 297;
const MARGEN = 18;
const CONTENIDO = ANCHO - MARGEN * 2;
const LIMITE_INFERIOR = 272; // desde aquí empieza el pie de página

// ===== Colores (RGB) =====
const C = {
  marca: [200, 16, 46], // rojo Uleam
  texto: [15, 23, 42],
  suave: [71, 85, 105],
  tenue: [148, 163, 184],
  borde: [226, 232, 240],
  fondo: [248, 250, 252],
  cabecera: [30, 41, 59],
  alertaFondo: [254, 242, 242],
  alertaTexto: [185, 28, 28],
  blanco: [255, 255, 255],
};

const ESTADOS_HISTORIAL = {
  completado: { texto: 'Completado', fondo: [220, 252, 231], color: [21, 128, 61] },
  proceso: { texto: 'En proceso', fondo: [219, 234, 254], color: [29, 78, 216] },
  pendiente: { texto: 'Pendiente', fondo: [254, 249, 195], color: [161, 98, 7] },
};

const hexARgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// ==================== UTILIDADES DE DIBUJO ====================

const relleno = (doc, rgb) => doc.setFillColor(...rgb);
const trazo = (doc, rgb) => doc.setDrawColor(...rgb);
const colorTexto = (doc, rgb) => doc.setTextColor(...rgb);

const fuente = (doc, tamano, estilo = 'normal', color = C.texto) => {
  doc.setFont('helvetica', estilo);
  doc.setFontSize(tamano);
  colorTexto(doc, color);
};

/** Carga una imagen (URL del bundle) como data URL para incrustarla en el PDF */
const cargarImagen = async (url) => {
  const respuesta = await fetch(url);
  const blob = await respuesta.blob();
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = reject;
    lector.readAsDataURL(blob);
  });
};

const numeroDocumento = (prefijo) => {
  const ahora = new Date();
  const hora = `${String(ahora.getHours()).padStart(2, '0')}${String(ahora.getMinutes()).padStart(2, '0')}`;
  return `${prefijo}-${fechaLocalISO(ahora).replace(/-/g, '')}-${hora}`;
};

const nombreArchivo = (texto) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_');

// ==================== PARTES COMUNES ====================

/** Encabezado institucional con logo, título del documento y número */
function encabezado(doc, logo, { titulo, numero, fecha }) {
  doc.addImage(logo, 'PNG', MARGEN, 11, 25, 21.5);

  fuente(doc, 11, 'bold');
  doc.text('UNIVERSIDAD LAICA ELOY ALFARO DE MANABÍ', MARGEN + 30, 18);
  fuente(doc, 9, 'normal', C.suave);
  doc.text('Carrera de Odontología', MARGEN + 30, 23.5);
  doc.text('Clínica Odontológica', MARGEN + 30, 28);

  fuente(doc, 13, 'bold', C.marca);
  doc.text(titulo, ANCHO - MARGEN, 18, { align: 'right' });
  fuente(doc, 8.5, 'normal', C.suave);
  doc.text(`N.º ${numero}`, ANCHO - MARGEN, 23.5, { align: 'right' });
  doc.text(fecha, ANCHO - MARGEN, 28, { align: 'right' });

  relleno(doc, C.marca);
  doc.rect(MARGEN, 36, CONTENIDO, 0.9, 'F');
  return 44;
}

/** Título de sección en mayúsculas con una línea a la derecha */
function seccion(doc, texto, y) {
  fuente(doc, 8.5, 'bold', C.marca);
  doc.text(texto.toUpperCase(), MARGEN, y);
  const ancho = doc.getTextWidth(texto.toUpperCase());
  trazo(doc, C.borde);
  doc.setLineWidth(0.3);
  doc.line(MARGEN + ancho + 3, y - 1.2, ANCHO - MARGEN, y - 1.2);
  return y + 5;
}

/**
 * Recuadro con datos en columnas.
 * filas: [[{ etiqueta, valor, alerta? }, ...], ...]
 */
function recuadroDatos(doc, filas, y) {
  const altoFila = 11.5;
  const alto = filas.length * altoFila + 4;
  relleno(doc, C.fondo);
  trazo(doc, C.borde);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGEN, y, CONTENIDO, alto, 2, 2, 'FD');

  filas.forEach((fila, i) => {
    const anchoCol = CONTENIDO / fila.length;
    fila.forEach((dato, j) => {
      const x = MARGEN + 5 + j * anchoCol;
      const yFila = y + 6.5 + i * altoFila;
      fuente(doc, 7, 'bold', C.tenue);
      doc.text(dato.etiqueta.toUpperCase(), x, yFila);
      fuente(doc, 10, 'bold', dato.alerta ? C.alertaTexto : C.texto);
      const valor = doc.splitTextToSize(String(dato.valor ?? '-'), anchoCol - 6)[0];
      doc.text(valor, x, yFila + 5);
    });
  });
  return y + alto + 8;
}

/** Aviso rojo (alergias) */
function aviso(doc, texto, y) {
  const lineas = doc.splitTextToSize(texto, CONTENIDO - 14);
  const alto = 7 + lineas.length * 4.5;
  relleno(doc, C.alertaFondo);
  doc.roundedRect(MARGEN, y, CONTENIDO, alto, 2, 2, 'F');
  relleno(doc, C.alertaTexto);
  doc.rect(MARGEN, y, 1.4, alto, 'F');
  fuente(doc, 9.5, 'bold', C.alertaTexto);
  doc.text(lineas, MARGEN + 6, y + 6);
  return y + alto + 7;
}

/** Línea de firma de la odontóloga */
function firma(doc, y) {
  const x = ANCHO - MARGEN - 70;
  trazo(doc, C.suave);
  doc.setLineWidth(0.3);
  doc.line(x, y, ANCHO - MARGEN, y);
  fuente(doc, 10, 'bold');
  doc.text(ODONTOLOGA, x + 35, y + 5, { align: 'center' });
  fuente(doc, 8.5, 'normal', C.suave);
  doc.text('Odontóloga tratante', x + 35, y + 9.5, { align: 'center' });
  fuente(doc, 8, 'normal', C.tenue);
  doc.text('Firma y sello', MARGEN, y + 5);
}

/** Pie con número de página en todas las hojas (se llama al final) */
function piesDePagina(doc) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    trazo(doc, C.borde);
    doc.setLineWidth(0.3);
    doc.line(MARGEN, ALTO - 16, ANCHO - MARGEN, ALTO - 16);
    fuente(doc, 7.5, 'normal', C.tenue);
    doc.text('Documento generado por el Sistema de gestión dental · Uleam', MARGEN, ALTO - 11);
    doc.text(`Página ${i} de ${total}`, ANCHO - MARGEN, ALTO - 11, { align: 'right' });
  }
}

const datosPaciente = (paciente, extra = []) => [
  [
    { etiqueta: 'Paciente', valor: paciente.nombre },
    { etiqueta: 'Cédula', valor: paciente.cedula },
    { etiqueta: 'Edad', valor: paciente.edad ? `${paciente.edad} años` : '-' },
  ],
  [
    { etiqueta: 'Sexo', valor: paciente.sexo || '-' },
    ...extra,
  ],
];

const tieneAlergia = (paciente) => paciente.alergias && paciente.alergias !== 'Ninguna';

// ==================== RECETA MÉDICA ====================

export async function generarRecetaPDF(paciente, receta) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await cargarImagen(logoUleam);

  let y = encabezado(doc, logo, {
    titulo: 'RECETA MÉDICA',
    numero: numeroDocumento('RX'),
    fecha: formatearFechaHora(new Date()),
  });

  y = recuadroDatos(doc, datosPaciente(paciente, [
    { etiqueta: 'Consulta', valor: paciente.tratamiento || '-' },
    { etiqueta: 'Alergias', valor: tieneAlergia(paciente) ? paciente.alergias : 'Ninguna', alerta: tieneAlergia(paciente) },
  ]), y);

  if (tieneAlergia(paciente)) {
    y = aviso(doc, `Atención: paciente con ${paciente.alergias.toLowerCase()}. Verificar antes de dispensar.`, y);
  }

  // Símbolo de prescripción
  fuente(doc, 26, 'bolditalic', C.marca);
  doc.text('Rp.', MARGEN, y + 8);
  y += 15;

  // Tarjeta del medicamento
  const altoTarjeta = 34;
  trazo(doc, C.borde);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGEN, y, CONTENIDO, altoTarjeta, 2.5, 2.5, 'S');
  relleno(doc, C.marca);
  doc.rect(MARGEN, y + 3, 1.4, altoTarjeta - 6, 'F');

  fuente(doc, 15, 'bold');
  doc.text(receta.medicamento, MARGEN + 7, y + 10);

  const columnas = [['Dosis', receta.dosis], ['Frecuencia', receta.frecuencia], ['Duración', receta.duracion]];
  const anchoCol = (CONTENIDO - 14) / 3;
  columnas.forEach(([etiqueta, valor], i) => {
    const x = MARGEN + 7 + i * anchoCol;
    relleno(doc, C.fondo);
    doc.roundedRect(x, y + 15, anchoCol - 4, 14, 1.5, 1.5, 'F');
    fuente(doc, 7, 'bold', C.tenue);
    doc.text(etiqueta.toUpperCase(), x + 3.5, y + 20);
    fuente(doc, 10.5, 'bold');
    doc.text(doc.splitTextToSize(valor, anchoCol - 10)[0], x + 3.5, y + 25.5);
  });
  y += altoTarjeta + 10;

  // Indicaciones
  y = seccion(doc, 'Indicaciones', y);
  fuente(doc, 10.5, 'normal', receta.indicaciones ? C.texto : C.tenue);
  const indicaciones = doc.splitTextToSize(receta.indicaciones || 'Sin indicaciones adicionales.', CONTENIDO);
  doc.text(indicaciones, MARGEN, y + 1);
  y += indicaciones.length * 5 + 8;

  // Recomendaciones generales para el paciente
  y = seccion(doc, 'Recomendaciones', y);
  fuente(doc, 9.5, 'normal', C.suave);
  [
    'Siga la dosis y el horario indicados. No suspenda el tratamiento sin consultar.',
    'Si presenta reacciones adversas, suspenda el medicamento y acuda a la clínica.',
  ].forEach((linea) => {
    relleno(doc, C.tenue);
    doc.circle(MARGEN + 1.2, y - 1.1, 0.7, 'F');
    doc.text(linea, MARGEN + 4.5, y);
    y += 5.5;
  });

  firma(doc, 250);
  piesDePagina(doc);
  doc.save(`Receta_${nombreArchivo(paciente.nombre)}.pdf`);
}

// ==================== ODONTOGRAMA EN EL PDF ====================

/** Dibuja el odontograma (dentición permanente) con un diente simplificado por pieza */
function odontogramaPDF(doc, estados, y) {
  const anchoDiente = 9.2;
  const separacion = 1;
  const separacionCuadrante = 5;
  const anchoArcada = 16 * anchoDiente + 14 * separacion + separacionCuadrante;
  const xInicio = MARGEN + (CONTENIDO - anchoArcada) / 2;

  relleno(doc, [255, 247, 248]);
  trazo(doc, [246, 221, 226]);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGEN, y, CONTENIDO, 58, 2.5, 2.5, 'FD');

  const centro = y + 29; // línea media entre arcadas
  doc.setLineDashPattern([1, 1], 0);
  trazo(doc, [232, 185, 194]);
  doc.line(MARGEN + 6, centro, ANCHO - MARGEN - 6, centro);
  doc.setLineDashPattern([], 0);

  fuente(doc, 6.5, 'bold', C.tenue);
  doc.text('DERECHA', MARGEN + 3, centro + 1, { angle: 90 });
  doc.text('IZQUIERDA', ANCHO - MARGEN - 3, centro - 7.5, { angle: -90 });

  const dibujarArcada = (cuadrantes, superior) => {
    let x = xInicio;
    cuadrantes.forEach((cuadrante, iCuadrante) => {
      cuadrante.forEach((numero) => {
        const info = estadoDiente(estados[numero]);
        const tipo = tipoDiente(numero);
        const anchoCorona = tipo === 'molar' ? anchoDiente : tipo === 'premolar' ? anchoDiente - 1.2 : anchoDiente - 2.6;
        const xc = x + (anchoDiente - anchoCorona) / 2;
        // superior: raíz arriba, corona abajo (junto a la línea media)
        const yCorona = superior ? centro - 15.5 : centro + 7.5;
        const yRaiz = superior ? centro - 15.5 : centro + 15.5;
        const puntaRaiz = superior ? centro - 23 : centro + 23;

        doc.setLineWidth(0.25);
        relleno(doc, [243, 236, 224]);
        trazo(doc, [201, 187, 164]);
        if (tipo === 'molar') {
          doc.triangle(xc + 0.6, yRaiz, xc + anchoCorona / 2 - 0.4, yRaiz, xc + anchoCorona / 4, puntaRaiz, 'FD');
          doc.triangle(xc + anchoCorona / 2 + 0.4, yRaiz, xc + anchoCorona - 0.6, yRaiz, xc + (anchoCorona * 3) / 4, puntaRaiz, 'FD');
        } else {
          doc.triangle(xc + 1, yRaiz, xc + anchoCorona - 1, yRaiz, xc + anchoCorona / 2, puntaRaiz, 'FD');
        }

        relleno(doc, info ? hexARgb(info.fill) : C.blanco);
        trazo(doc, info ? hexARgb(info.stroke) : [184, 192, 204]);
        doc.setLineWidth(0.4);
        doc.roundedRect(xc, yCorona, anchoCorona, 8, 1.6, 1.6, 'FD');

        if (estados[numero] === 'ausente') {
          trazo(doc, [107, 114, 128]);
          doc.setLineWidth(0.5);
          doc.line(xc, yCorona - 2, xc + anchoCorona, yCorona + 10);
          doc.line(xc + anchoCorona, yCorona - 2, xc, yCorona + 10);
        }

        fuente(doc, 6.5, 'bold', info ? hexARgb(info.text) : C.suave);
        doc.text(String(numero), x + anchoDiente / 2, superior ? centro - 2.5 : centro + 5, { align: 'center' });
        x += anchoDiente + separacion;
      });
      if (iCuadrante === 0) x += separacionCuadrante - separacion;
    });
  };

  dibujarArcada(DIENTES.adulto.superior, true);
  dibujarArcada(DIENTES.adulto.inferior, false);

  // Leyenda con totales
  let x = MARGEN;
  const yLeyenda = y + 65;
  ESTADOS_DIENTE.forEach((e) => {
    const total = Object.values(estados).filter((v) => v === e.id).length;
    relleno(doc, hexARgb(e.fill));
    trazo(doc, hexARgb(e.stroke));
    doc.setLineWidth(0.3);
    doc.roundedRect(x, yLeyenda - 3, 3.5, 3.5, 0.8, 0.8, 'FD');
    fuente(doc, 8.5, 'normal', C.suave);
    const etiqueta = `${e.label}: ${total}`;
    doc.text(etiqueta, x + 5, yLeyenda);
    x += doc.getTextWidth(etiqueta) + 12;
  });

  return yLeyenda + 9;
}

// ==================== HISTORIAL CLÍNICO ====================

const COLUMNAS = [
  { titulo: 'Fecha', ancho: 24 },
  { titulo: 'Pieza', ancho: 22 },
  { titulo: 'Procedimiento', ancho: 30 },
  { titulo: 'Diagnóstico y notas', ancho: 72 },
  { titulo: 'Estado', ancho: 26 },
];

function cabeceraTabla(doc, y) {
  relleno(doc, C.cabecera);
  doc.roundedRect(MARGEN, y, CONTENIDO, 8, 1.5, 1.5, 'F');
  fuente(doc, 7.5, 'bold', C.blanco);
  let x = MARGEN;
  COLUMNAS.forEach((col) => {
    doc.text(col.titulo.toUpperCase(), x + 3, y + 5.3);
    x += col.ancho;
  });
  return y + 8;
}

/**
 * Historial clínico del paciente. Si se pasa `fecha` (YYYY-MM-DD), solo
 * incluye los procedimientos de ese día.
 */
export async function generarHistorialPDF(paciente, historial, { fecha = null, odontograma = {} } = {}) {
  const registros = fecha
    ? historial.filter((h) => {
      const f = aFecha(h.fechaRegistro || h.fecha);
      return f && fechaLocalISO(f) === fecha;
    })
    : historial;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await cargarImagen(logoUleam);

  let y = encabezado(doc, logo, {
    titulo: 'HISTORIAL CLÍNICO',
    numero: `HC-${paciente.cedula}`,
    fecha: `Emitido: ${formatearFechaHora(new Date())}`,
  });

  y = recuadroDatos(doc, datosPaciente(paciente, [
    { etiqueta: 'Periodo', valor: fecha ? formatearFecha(fecha) : 'Todas las fechas' },
    { etiqueta: 'Registros', valor: String(registros.length) },
  ]), y);

  if (tieneAlergia(paciente)) {
    y = aviso(doc, `Atención: ${paciente.alergias}`, y);
  }

  // Signos vitales
  if (paciente.signosVitales) {
    y = seccion(doc, 'Signos vitales (enfermería)', y);
    const sv = paciente.signosVitales;
    const datos = [['Presión arterial', sv.presion], ['Pulso', sv.pulso], ['Temperatura', sv.temperatura]];
    const ancho = (CONTENIDO - 8) / 3;
    datos.forEach(([etiqueta, valor], i) => {
      const x = MARGEN + i * (ancho + 4);
      relleno(doc, C.fondo);
      trazo(doc, C.borde);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, ancho, 15, 2, 2, 'FD');
      fuente(doc, 7, 'bold', C.tenue);
      doc.text(etiqueta.toUpperCase(), x + 4, y + 5.5);
      fuente(doc, 12, 'bold');
      doc.text(String(valor || '-'), x + 4, y + 11.5);
    });
    y += 23;
  }

  // Odontograma
  y = seccion(doc, 'Odontograma', y);
  y = odontogramaPDF(doc, odontograma, y);

  // Tabla de procedimientos
  y = seccion(doc, 'Procedimientos y diagnósticos', y);
  y = cabeceraTabla(doc, y);

  if (!registros.length) {
    fuente(doc, 9.5, 'italic', C.tenue);
    doc.text('No existen registros para el periodo seleccionado.', MARGEN + 3, y + 7);
    y += 12;
  }

  registros.forEach((h, i) => {
    fuente(doc, 9, 'bold');
    // "11, 26, 36" se reparte en varias líneas si no cabe en la columna
    const piezas = doc.splitTextToSize(String(h.diente).replace(/\s*,\s*/g, ', '), COLUMNAS[1].ancho - 5);
    fuente(doc, 9);
    const diagnostico = doc.splitTextToSize(h.diagnostico || '-', COLUMNAS[3].ancho - 6);
    const notas = h.notas ? doc.splitTextToSize(h.notas, COLUMNAS[3].ancho - 6) : [];
    const alto = Math.max(10, 6 + diagnostico.length * 4.2 + notas.length * 3.8, 6 + piezas.length * 4.2);

    if (y + alto > LIMITE_INFERIOR) {
      doc.addPage();
      y = cabeceraTabla(doc, 20);
    }

    if (i % 2 === 1) {
      relleno(doc, C.fondo);
      doc.rect(MARGEN, y, CONTENIDO, alto, 'F');
    }
    trazo(doc, C.borde);
    doc.setLineWidth(0.2);
    doc.line(MARGEN, y + alto, ANCHO - MARGEN, y + alto);

    let x = MARGEN;
    const yTexto = y + 6;
    fuente(doc, 9, 'normal', C.suave);
    doc.text(formatearFecha(h.fechaRegistro || h.fecha), x + 3, yTexto);
    x += COLUMNAS[0].ancho;
    fuente(doc, 9, 'bold');
    doc.text(piezas, x + 3, yTexto);
    x += COLUMNAS[1].ancho;
    fuente(doc, 9);
    doc.text(h.procedimiento, x + 3, yTexto);
    x += COLUMNAS[2].ancho;
    doc.text(diagnostico, x + 3, yTexto);
    if (notas.length) {
      fuente(doc, 8, 'italic', C.suave);
      doc.text(notas, x + 3, yTexto + diagnostico.length * 4.2);
    }
    x += COLUMNAS[3].ancho;

    const estado = ESTADOS_HISTORIAL[h.estado] || { texto: h.estado, fondo: C.fondo, color: C.suave };
    fuente(doc, 7.5, 'bold', estado.color);
    const anchoPastilla = doc.getTextWidth(estado.texto) + 5;
    relleno(doc, estado.fondo);
    doc.roundedRect(x + 2, yTexto - 3.6, anchoPastilla, 5.2, 2.6, 2.6, 'F');
    doc.text(estado.texto, x + 4.5, yTexto);

    y += alto;
  });

  // Firma (en una hoja nueva si no cabe)
  if (y + 30 > LIMITE_INFERIOR) {
    doc.addPage();
    y = 20;
  }
  firma(doc, Math.max(y + 22, 245));

  piesDePagina(doc);
  doc.save(`Historial_${nombreArchivo(paciente.nombre)}${fecha ? `_${fecha}` : ''}.pdf`);
}
