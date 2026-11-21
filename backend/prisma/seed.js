// ==================== DATOS DE PRUEBA ====================
// Ejecutar con: npm run db:seed
// Borra los datos clínicos y vuelve a crearlos. Solo para desarrollo.

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

if (process.env.NODE_ENV === 'production') {
  console.error('El seed no se ejecuta en producción.');
  process.exit(1);
}

const PASSWORD = process.env.SEED_PASSWORD || 'Clinica2026!';

// Fecha de hoy en Ecuador (UTC-5, sin horario de verano) en formato YYYY-MM-DD
const hoyEcuador = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
const enEcuador = (fecha, hora) => new Date(`${fecha}T${hora}:00-05:00`);
const haceDias = (dias, hora) => {
  const d = new Date(`${hoyEcuador()}T12:00:00-05:00`);
  d.setUTCDate(d.getUTCDate() - dias);
  return enEcuador(d.toISOString().slice(0, 10), hora);
};

async function limpiar() {
  // Orden inverso a las dependencias
  await prisma.auditoria.deleteMany();
  await prisma.recordatorio.deleteMany();
  await prisma.consentimiento.deleteMany();
  await prisma.recetaMedicamento.deleteMany();
  await prisma.receta.deleteMany();
  await prisma.marcaOdontograma.deleteMany();
  await prisma.diagnostico.deleteMany();
  await prisma.alertaMedica.deleteMany();
  await prisma.signosVitales.deleteMany();
  await prisma.cita.deleteMany();
  await prisma.antecedente.deleteMany();
  await prisma.paciente.deleteMany();
  await prisma.usuario.deleteMany();
}

// Igual que en src/routes/pacientes.js
const normalizar = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const conBusqueda = (data) => ({ ...data, textoBusqueda: normalizar(`${data.cedula} ${data.nombres} ${data.apellidos}`) });

async function main() {
  await limpiar();
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // ===== Usuarios =====
  const crearUsuario = (nombre, email, rol) => prisma.usuario.create({
    data: { nombre, email, rol, passwordHash, debeCambiarPassword: false },
  });
  const admin = await crearUsuario('Administrador', 'admin@live.uleam.edu.ec', 'ADMIN');
  const recepcion = await crearUsuario('Recepcionista', 'recepcionista@live.uleam.edu.ec', 'RECEPCIONISTA');
  const enfermera = await crearUsuario('Enfermera', 'enfermera@live.uleam.edu.ec', 'ENFERMERA');
  const odontologa = await crearUsuario('Dra. María Fernanda López', 'odontologa@live.uleam.edu.ec', 'ODONTOLOGA');

  // ===== Pacientes (edades variadas para probar las alertas) =====
  const [mateo, rosa, luis, sofia] = await Promise.all([
    prisma.paciente.create({ data: conBusqueda({
      cedula: '1312345678', nombres: 'Mateo Andrés', apellidos: 'Vera Zambrano',
      fechaNacimiento: new Date('2021-03-14'), sexo: 'MASCULINO', telefono: '0991234567',
      correo: 'familia.vera@mail.com',
      contactoEmergenciaNombre: 'Carla Zambrano (madre)', contactoEmergenciaTelefono: '0991234568',
    }) }),
    prisma.paciente.create({ data: conBusqueda({
      cedula: '1309876543', nombres: 'Rosa Elena', apellidos: 'Macías Cedeño',
      fechaNacimiento: new Date('1954-08-02'), sexo: 'FEMENINO', telefono: '0987654321', correo: 'rosa.macias@mail.com',
    }) }),
    prisma.paciente.create({ data: conBusqueda({
      cedula: '1305556667', nombres: 'Luis Fernando', apellidos: 'Pico Alcívar',
      fechaNacimiento: new Date('1990-11-20'), sexo: 'MASCULINO', telefono: '0993334445', correo: 'luis.pico@mail.com',
    }) }),
    prisma.paciente.create({ data: conBusqueda({
      cedula: '1311122233', nombres: 'Sofía Valentina', apellidos: 'Mendoza Loor',
      fechaNacimiento: new Date('2025-06-10'), sexo: 'FEMENINO', telefono: '0998887776',
      contactoEmergenciaNombre: 'Jorge Mendoza (padre)', contactoEmergenciaTelefono: '0998887777',
    }) }),
  ]);

  // ===== Antecedentes =====
  await prisma.antecedente.createMany({ data: [
    { pacienteId: rosa.id, tipo: 'ENFERMEDAD', descripcion: 'Hipertensión arterial', registradoPorId: enfermera.id },
    { pacienteId: rosa.id, tipo: 'MEDICACION', descripcion: 'Losartán 50 mg cada 24 horas', registradoPorId: enfermera.id },
    { pacienteId: mateo.id, tipo: 'ALERGIA', descripcion: 'Amoxicilina', registradoPorId: enfermera.id },
    { pacienteId: luis.id, tipo: 'HABITO', descripcion: 'Fumador (10 cigarrillos al día)', registradoPorId: odontologa.id },
  ] });

  // ===== Visita anterior completa de Rosa (hace 20 días) =====
  const visita = await prisma.cita.create({ data: {
    pacienteId: rosa.id, inicio: haceDias(20, '10:00'), tipoConsulta: 'Revisión', estado: 'ATENDIDA',
    confirmadaEn: haceDias(21, '16:00'), llegadaEn: haceDias(20, '09:52'),
    preparadaEn: haceDias(20, '10:05'), atendidaEn: haceDias(20, '10:40'), creadaPorId: recepcion.id,
  } });
  const signos = await prisma.signosVitales.create({ data: {
    citaId: visita.id, presionSistolica: 148, presionDiastolica: 92, pulso: 78, temperatura: 36.6,
    frecuenciaRespiratoria: 16, saturacionO2: 97, edadMeses: 867, registradoPorId: enfermera.id,
  } });
  await prisma.alertaMedica.create({ data: {
    pacienteId: rosa.id, citaId: visita.id, signosVitalesId: signos.id, tipo: 'SIGNOS_VITALES', signo: 'presion',
    severidad: 'ALTA', titulo: 'Hipertensión estadio 2', descripcion: 'Presión de 148/92 mmHg (140/90 o más).',
  } });
  await prisma.diagnostico.create({ data: {
    citaId: visita.id, piezas: [36], procedimiento: 'Resina', descripcion: 'Caries oclusal en primer molar inferior izquierdo',
    estado: 'COMPLETADO', odontologoId: odontologa.id,
  } });
  await prisma.marcaOdontograma.createMany({ data: [
    { pacienteId: rosa.id, citaId: visita.id, pieza: 36, cara: 'OCLUSAL', estado: 'TRATADO', registradoPorId: odontologa.id },
    { pacienteId: rosa.id, citaId: visita.id, pieza: 18, cara: 'COMPLETA', estado: 'AUSENTE', registradoPorId: odontologa.id },
    { pacienteId: rosa.id, citaId: visita.id, pieza: 46, cara: 'DISTAL', estado: 'CARIES', registradoPorId: odontologa.id },
  ] });
  await prisma.receta.create({ data: {
    numero: 'RX-SEED-0001', citaId: visita.id, pacienteId: rosa.id, odontologoId: odontologa.id,
    indicaciones: 'Tomar después de las comidas.',
    medicamentos: { create: [{ medicamento: 'Paracetamol', dosis: '500 mg', frecuencia: 'Cada 8 horas', duracion: '3 días' }] },
  } });

  // ===== Citas de hoy =====
  const hoy = hoyEcuador();
  await prisma.cita.createMany({ data: [
    { pacienteId: mateo.id, inicio: enEcuador(hoy, '09:00'), tipoConsulta: 'Revisión', estado: 'CONFIRMADA',
      confirmadaEn: new Date(), llegadaEn: new Date(), creadaPorId: recepcion.id },
    { pacienteId: rosa.id, inicio: enEcuador(hoy, '09:30'), tipoConsulta: 'Extracción', estado: 'CONFIRMADA',
      confirmadaEn: new Date(), llegadaEn: new Date(), creadaPorId: recepcion.id },
    { pacienteId: luis.id, inicio: enEcuador(hoy, '10:30'), tipoConsulta: 'Limpieza dental', estado: 'PENDIENTE',
      creadaPorId: recepcion.id },
    { pacienteId: sofia.id, inicio: enEcuador(hoy, '11:00'), tipoConsulta: 'Revisión', estado: 'PENDIENTE',
      creadaPorId: recepcion.id },
  ] });

  await prisma.auditoria.create({ data: {
    usuarioId: admin.id, accion: 'CREAR', entidad: 'Seed', detalle: { mensaje: 'Datos de prueba cargados' },
  } });

  console.log('Datos de prueba creados.');
  console.log(`Usuarios (contraseña: ${PASSWORD}):`);
  [admin, recepcion, enfermera, odontologa].forEach((u) => console.log(`  ${u.rol.padEnd(14)} ${u.email}`));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
