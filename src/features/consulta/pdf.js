// ==================== DOCUMENTOS PDF DE LA CONSULTA ====================
import { jsPDF } from 'jspdf';
import { fechaLocalISO } from '../../services/clinica';
import { aFecha, formatearFecha } from '../../utils/formato';

const ODONTOLOGA = 'Dra. María Fernanda López';
const ESTADOS = { completado: 'Completado', proceso: 'En proceso', pendiente: 'Pendiente' };

const encabezado = (doc, titulo) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CARRERA DE ODONTOLOGÍA - Uleam', 105, 18, { align: 'center' });
  doc.setFontSize(12);
  doc.text(titulo, 105, 27, { align: 'center' });
  doc.setDrawColor(200);
  doc.line(15, 32, 195, 32);
};

const fila = (doc, etiqueta, valor, x, y) => {
  doc.setFont('helvetica', 'bold');
  doc.text(`${etiqueta}:`, x, y);
  doc.setFont('helvetica', 'normal');
  doc.text(String(valor ?? 'N/A'), x + doc.getTextWidth(`${etiqueta}: `), y);
};

const pie = (doc) => {
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('Universidad Laica Eloy Alfaro de Manabí (Uleam)', 105, 288, { align: 'center' });
};

const nombreArchivo = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_');

export function generarRecetaPDF(paciente, receta) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  encabezado(doc, 'Receta médica');

  doc.setFontSize(10);
  fila(doc, 'Paciente', paciente.nombre, 15, 44);
  fila(doc, 'Cédula', paciente.cedula, 15, 50);
  fila(doc, 'Fecha', formatearFecha(new Date()), 150, 44);

  let y = 66;
  [['Medicamento', receta.medicamento], ['Dosis', receta.dosis], ['Frecuencia', receta.frecuencia], ['Duración', receta.duracion]]
    .forEach(([etiqueta, valor]) => { fila(doc, etiqueta, valor, 15, y); y += 9; });

  doc.setFont('helvetica', 'bold');
  doc.text('Indicaciones:', 15, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(receta.indicaciones || 'Sin indicaciones adicionales.', 15, y + 13, { maxWidth: 180 });

  doc.line(130, 260, 190, 260);
  doc.setFont('helvetica', 'italic');
  doc.text(ODONTOLOGA, 160, 266, { align: 'center' });
  doc.text('Odontóloga tratante', 160, 271, { align: 'center' });
  pie(doc);

  doc.save(`Receta_${nombreArchivo(paciente.nombre)}.pdf`);
}

/**
 * Historial clínico del paciente. Si se pasa `fecha` (YYYY-MM-DD), solo
 * incluye los registros de ese día.
 */
export function generarHistorialPDF(paciente, historial, fecha) {
  const registros = fecha
    ? historial.filter((h) => {
      const f = aFecha(h.fechaRegistro || h.fecha);
      return f && fechaLocalISO(f) === fecha;
    })
    : historial;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  encabezado(doc, 'Historial clínico');

  doc.setFontSize(10);
  fila(doc, 'Paciente', paciente.nombre, 15, 44);
  fila(doc, 'Cédula', paciente.cedula, 15, 50);
  fila(doc, 'Edad', paciente.edad, 15, 56);
  fila(doc, 'Sexo', paciente.sexo, 15, 62);
  fila(doc, 'Periodo', fecha ? formatearFecha(fecha) : 'Todas las fechas', 120, 44);

  let y = 76;
  if (paciente.signosVitales) {
    doc.setFont('helvetica', 'bold');
    doc.text('Signos vitales (enfermería)', 15, y);
    doc.setFont('helvetica', 'normal');
    const sv = paciente.signosVitales;
    doc.text(`Presión: ${sv.presion}   Pulso: ${sv.pulso}   Temperatura: ${sv.temperatura}`, 15, y + 6);
    y += 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha', 15, y);
  doc.text('Pieza', 45, y);
  doc.text('Procedimiento', 70, y);
  doc.text('Diagnóstico', 110, y);
  doc.text('Estado', 172, y);
  doc.line(15, y + 2, 195, y + 2);
  doc.setFont('helvetica', 'normal');
  y += 9;

  if (!registros.length) {
    doc.text('No existen registros para el periodo seleccionado.', 15, y);
  }

  registros.forEach((h) => {
    if (y > 270) {
      pie(doc);
      doc.addPage();
      y = 20;
    }
    const lineas = doc.splitTextToSize(h.diagnostico || '-', 58);
    doc.text(formatearFecha(h.fechaRegistro || h.fecha), 15, y);
    doc.text(String(h.diente), 45, y);
    doc.text(h.procedimiento, 70, y);
    doc.text(lineas, 110, y);
    doc.text(ESTADOS[h.estado] || h.estado, 172, y);
    y += Math.max(8, lineas.length * 5 + 3);
  });

  doc.setFont('helvetica', 'normal');
  doc.text(`Odontóloga responsable: ${ODONTOLOGA}`, 15, 276);
  pie(doc);
  doc.save(`Historial_${nombreArchivo(paciente.nombre)}${fecha ? `_${fecha}` : ''}.pdf`);
}
