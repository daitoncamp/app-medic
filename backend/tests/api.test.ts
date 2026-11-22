// ==================== PRUEBA DE INTEGRACIÓN DE LA API ====================
// Recorre el flujo de la clínica contra una base de datos PostgreSQL real:
// recepción → enfermería → odontología → ficha, recordatorios y cierre del día.
//
// Modifica datos, así que solo corre con RUN_API_TESTS=1 y una base de datos de
// pruebas recién sembrada (es lo que hace GitHub Actions). No la ejecutes contra
// la base de datos de desarrollo.

import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';

/** Respuesta de la API: el JSON se revisa con expect, por eso se deja sin tipo */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const activa = process.env.RUN_API_TESTS === '1';
const PASSWORD = process.env.SEED_PASSWORD || 'Clinica2026!';

describe.skipIf(!activa)('API de la clínica (integración)', () => {
  let servidor: Server;
  let base: string;
  let prisma: PrismaClient;
  let fechas: typeof import('../src/lib/fechas.ts');

  beforeAll(async () => {
    const { app } = await import('../src/app.ts');
    ({ prisma } = await import('../src/lib/prisma.ts'));
    fechas = await import('../src/lib/fechas.ts');
    servidor = app.listen(0);
    await new Promise((listo) => { servidor.once('listening', listo); });
    base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api`;
  });

  afterAll(async () => {
    await new Promise((listo) => { servidor?.close(() => listo(null)); });
    await prisma?.$disconnect();
  });

  /** Cliente con su propia cookie de sesión */
  const cliente = () => {
    let cookie = '';
    const pedir = async (metodo: string, ruta: string, cuerpo?: unknown): Promise<{ status: number; datos: Json }> => {
      const res = await fetch(base + ruta, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
      const nueva = res.headers.getSetCookie?.().find((c: string) => c.startsWith('clinica_sesion='));
      if (nueva) cookie = nueva.split(';')[0];
      const texto = await res.text();
      return { status: res.status, datos: texto ? JSON.parse(texto) : null };
    };
    return {
      get: (r: string) => pedir('GET', r),
      post: (r: string, c: unknown = {}) => pedir('POST', r, c),
      put: (r: string, c: unknown = {}) => pedir('PUT', r, c),
      patch: (r: string, c: unknown = {}) => pedir('PATCH', r, c),
      entrar: async (usuario: string) => {
        const r = await pedir('POST', '/auth/login', { email: `${usuario}@live.uleam.edu.ec`, password: PASSWORD });
        expect(r.status).toBe(200);
        return r.datos.usuario;
      },
    };
  };

  const recepcion = cliente();
  const enfermeria = cliente();
  const odontologia = cliente();
  let citaMateo: Json;

  it('responde la salud del servicio y de la base de datos', async () => {
    const r = await cliente().get('/salud');
    expect(r.status).toBe(200);
    expect(r.datos).toMatchObject({ estado: 'ok', baseDeDatos: 'ok' });
  });

  it('rechaza credenciales incorrectas y pide sesión', async () => {
    const anonimo = cliente();
    expect((await anonimo.post('/auth/login', { email: 'recepcionista@live.uleam.edu.ec', password: 'incorrecta1' })).status).toBe(401);
    expect((await anonimo.get('/citas')).status).toBe(401);
  });

  it('recepción ve las citas de hoy y agenda una nueva', async () => {
    expect((await recepcion.entrar('recepcionista')).rol).toBe('RECEPCIONISTA');
    const hoy = await recepcion.get('/citas');
    expect(hoy.status).toBe(200);
    expect(hoy.datos.citas.length).toBeGreaterThanOrEqual(4);

    const manana = fechas.sumarDias(fechas.hoyLocal(), 1);
    const nueva = {
      paciente: {
        cedula: '1714616123', nombres: 'Carla', apellidos: 'Prueba Integración', fechaNacimiento: '1995-06-15',
        sexo: 'FEMENINO', telefono: '0987654321', correo: '',
      },
      fecha: manana,
      hora: '15:00',
      tipoConsulta: 'Limpieza dental', // nombre antiguo: se acepta y se convierte
    };
    const creada = await recepcion.post('/citas', nueva);
    expect(creada.status).toBe(201);
    expect(creada.datos.cita).toMatchObject({ estado: 'PENDIENTE', tipoConsulta: 'Limpieza', hora: '15:00' });

    // Mismo horario: conflicto
    expect((await recepcion.post('/citas', { ...nueva, hora: '15:00' })).status).toBe(409);
  });

  it('la búsqueda de pacientes no distingue tildes', async () => {
    const r = await recepcion.get('/pacientes?buscar=macias');
    expect(r.status).toBe(200);
    expect(r.datos.pacientes.map((p: Json) => p.cedula)).toContain('1309876543');
  });

  it('cada rol solo entra a lo suyo', async () => {
    expect((await recepcion.get('/enfermeria/sala')).status).toBe(403);
    expect((await recepcion.get('/consultas/agenda')).status).toBe(403);
  });

  it('enfermería registra signos y el servidor crea las alertas según la edad', async () => {
    await enfermeria.entrar('enfermera');
    const sala = await enfermeria.get('/enfermeria/sala');
    expect(sala.status).toBe(200);
    citaMateo = sala.datos.enEspera.find((c: Json) => c.paciente.cedula === '1312345678');
    expect(citaMateo).toBeDefined();
    // Su alergia registrada llega a enfermería
    expect(citaMateo.antecedentes.map((a: Json) => a.descripcion)).toContain('Amoxicilina');

    // Errores de digitación: 400 con detalle por campo
    const malos = await enfermeria.post(`/enfermeria/citas/${citaMateo.id}/signos`, { presion: '80/90', pulso: 'x', temperatura: '' });
    expect(malos.status).toBe(400);
    expect(Object.keys(malos.datos.detalles)).toEqual(expect.arrayContaining(['presion', 'pulso', 'temperatura']));

    // Mateo tiene 5 años: 130 lpm es taquicardia y 38.6 °C es fiebre
    const r = await enfermeria.post(`/enfermeria/citas/${citaMateo.id}/signos`, {
      presion: '95/60', pulso: 130, temperatura: '38.6', frecuenciaRespiratoria: '24', observaciones: 'Niega otras alergias',
    });
    expect(r.status).toBe(201);
    const titulos = r.datos.alertas.map((a: Json) => a.titulo);
    expect(titulos).toContain('Taquicardia');
    expect(titulos).toContain('Fiebre');
    expect(titulos).not.toContain('Alergia'); // "niega" no crea alerta
    expect(r.datos.cita.estado).toBe('PREPARADA');

    // Una segunda toma del mismo paciente: conflicto
    expect((await enfermeria.post(`/enfermeria/citas/${citaMateo.id}/signos`, { presion: '95/60', pulso: 100, temperatura: '36.5' })).status).toBe(409);
  });

  it('odontología: consentimiento antes del procedimiento', async () => {
    await odontologia.entrar('odontologa');
    const agenda = await odontologia.get('/consultas/agenda');
    expect(agenda.datos.agenda.map((c: Json) => c.id)).toContain(citaMateo.id);

    const diagnostico = {
      piezas: '84', procedimiento: 'Extracción', descripcion: 'Pieza temporal con movilidad', estado: 'COMPLETADO',
    };
    const sinConsentimiento = await odontologia.post(`/consultas/${citaMateo.id}/diagnosticos`, diagnostico);
    expect(sinConsentimiento.status).toBe(409);
    expect(sinConsentimiento.datos.detalles.procedimiento).toMatch(/consentimiento/);

    // Planificado (pendiente) no necesita consentimiento
    expect((await odontologia.post(`/consultas/${citaMateo.id}/diagnosticos`, { ...diagnostico, piezas: '85', estado: 'PENDIENTE' })).status).toBe(201);

    // Es menor de edad: debe firmar un representante
    const sinRepresentante = await odontologia.post(`/consultas/${citaMateo.id}/consentimientos`, {
      procedimiento: 'Extracción', esRepresentante: false, aceptado: true,
    });
    expect(sinRepresentante.status).toBe(400);

    const consentimiento = await odontologia.post(`/consultas/${citaMateo.id}/consentimientos`, {
      procedimiento: 'Extracción',
      esRepresentante: true,
      firmante: { nombre: 'Ana Zambrano', cedula: '1714616123', parentesco: 'Madre' },
      aceptado: true,
    });
    expect(consentimiento.status).toBe(201);
    expect(consentimiento.datos.consentimiento.textoAceptado).toMatch(/en calidad de madre de Mateo Andrés Vera Zambrano/);

    expect((await odontologia.post(`/consultas/${citaMateo.id}/diagnosticos`, diagnostico)).status).toBe(201);
  });

  it('odontología: odontograma por caras y receta con aviso de alergia', async () => {
    const caras = await odontologia.put(`/consultas/${citaMateo.id}/odontograma/55`, { estado: 'CARIES', cara: 'OCLUSAL' });
    expect(caras.status).toBe(200);
    expect(caras.datos.odontograma.actual['55']).toEqual({ completa: null, caras: { OCLUSAL: 'CARIES' } });
    expect((await odontologia.put(`/consultas/${citaMateo.id}/odontograma/55`, { estado: 'AUSENTE', cara: 'OCLUSAL' })).status).toBe(400);
    expect((await odontologia.put(`/consultas/${citaMateo.id}/odontograma/19`, { estado: 'CARIES' })).status).toBe(400);

    const receta = {
      medicamentos: [{
        medicamento: 'Amoxicilina', dosis: '250 mg', frecuencia: 'Cada 8 horas', duracion: '7 días',
      }],
      indicaciones: 'Después de las comidas',
    };
    // Mateo es alérgico a la amoxicilina: se exige confirmación
    const sinConfirmar = await odontologia.post(`/consultas/${citaMateo.id}/recetas`, receta);
    expect(sinConfirmar.status).toBe(409);
    expect(sinConfirmar.datos.detalles['medicamentos.0.medicamento']).toMatch(/Posible alergia/);

    const emitida = await odontologia.post(`/consultas/${citaMateo.id}/recetas`, {
      ...receta,
      medicamentos: [{ ...receta.medicamentos[0], medicamento: 'Paracetamol' }],
    });
    expect(emitida.status).toBe(201);
    expect(emitida.datos.receta.numero).toMatch(/^RX-\d{8}-\d{4}$/);
  });

  it('odontología finaliza y la ficha muestra todo lo registrado', async () => {
    expect((await odontologia.post(`/consultas/${citaMateo.id}/finalizar`)).status).toBe(200);
    expect((await odontologia.post(`/consultas/${citaMateo.id}/finalizar`)).status).toBe(409);

    const ficha = await recepcion.get('/pacientes/1312345678');
    expect(ficha.status).toBe(200);
    const cita = ficha.datos.citas.find((c: Json) => c.id === citaMateo.id);
    expect(cita.estado).toBe('ATENDIDA');
    expect(cita.consentimientos).toHaveLength(1);
    expect(cita.recetas).toHaveLength(1);
    expect(cita.signosVitales).toMatchObject({ pulso: 130, frecuenciaRespiratoria: 24 });
    expect(ficha.datos.odontograma['55']).toEqual({ completa: null, caras: { OCLUSAL: 'CARIES' } });
  });

  it('antecedentes: se agregan, no se duplican y se marcan como que ya no aplican', async () => {
    const nuevo = await enfermeria.post('/pacientes/1305556667/antecedentes', { tipo: 'ALERGIA', descripcion: 'Látex' });
    expect(nuevo.status).toBe(201);
    expect((await enfermeria.post('/pacientes/1305556667/antecedentes', { tipo: 'ALERGIA', descripcion: 'látex' })).status).toBe(409);
    const baja = await enfermeria.patch(`/pacientes/1305556667/antecedentes/${nuevo.datos.antecedente.id}`, { vigente: false });
    expect(baja.datos.antecedente.vigente).toBe(false);
  });

  it('recordatorios de mañana: se registran por WhatsApp o SMS', async () => {
    const r = await recepcion.get('/recordatorios');
    expect(r.status).toBe(200);
    expect(r.datos.citas.length).toBeGreaterThanOrEqual(3); // 2 del seed + la agendada
    const cita = r.datos.citas[0];
    expect((await recepcion.post(`/recordatorios/${cita.id}/enviado`, { canal: 'SMS' })).status).toBe(201);
    const despues = await recepcion.get('/recordatorios');
    expect(despues.datos.citas.find((c: Json) => c.id === cita.id).recordatorio.canal).toBe('SMS');
    expect(despues.datos.pendientes).toBe(r.datos.pendientes - 1);
  });

  it('editar un paciente conserva los datos opcionales que no se envían', async () => {
    const ficha = await recepcion.get('/pacientes/1305556667');
    const p = ficha.datos.paciente;
    const datos = {
      cedula: p.cedula, nombres: p.nombres, apellidos: p.apellidos, fechaNacimiento: p.fechaNacimiento,
      sexo: p.sexo, telefono: p.telefono,
    };
    const conContacto = await recepcion.patch('/pacientes/1305556667', { ...datos, contactoEmergenciaNombre: 'María Pico', contactoEmergenciaTelefono: '052631234' });
    expect(conContacto.status).toBe(200);
    // Sin enviar el contacto: no se borra
    const sinContacto = await recepcion.patch('/pacientes/1305556667', { ...datos, telefono: '0981112233' });
    expect(sinContacto.datos.paciente).toMatchObject({ telefono: '0981112233', contactoEmergenciaNombre: 'María Pico' });
  });

  it('el cierre del día cierra las citas abiertas de días anteriores', async () => {
    const { cerrarDiasAnteriores } = await import('../src/lib/cierreDia.ts');
    const paciente = await prisma.paciente.findUnique({ where: { cedula: '1311122233' } });
    const usuario = await prisma.usuario.findFirst({ where: { rol: 'RECEPCIONISTA' } });
    const ayer = fechas.sumarDias(fechas.hoyLocal(), -1);
    const vieja = await prisma.cita.create({
      data: {
        pacienteId: paciente.id, inicio: fechas.aInstante(ayer, '11:00'), tipoConsulta: 'Revisión', estado: 'PENDIENTE', creadaPorId: usuario.id,
      },
    });
    const resultado = await cerrarDiasAnteriores();
    expect(resultado.noAsistieron).toBeGreaterThanOrEqual(1);
    expect((await prisma.cita.findUnique({ where: { id: vieja.id } })).estado).toBe('NO_ASISTIO');
  });
});
