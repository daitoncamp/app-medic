# Backend: API de la Clínica Dental Uleam

Node.js + Express 5 + PostgreSQL + Prisma 6.

> **Estado: fase 2 de 6.** Funcionan el login, los roles y la gestión de usuarios.
> Las rutas de la clínica (citas, signos, consulta) llegan en la fase 3; mientras tanto
> el frontend guarda esos datos en `localStorage`.

## Requisitos

- **Node.js 20.19 o superior** (`node -v`)
- **PostgreSQL 15 o superior**, de una de estas dos formas:
  - **Opción A, Docker Desktop** (recomendada): no instalas PostgreSQL, se levanta con un comando.
  - **Opción B, PostgreSQL instalado en Windows**: desde https://www.postgresql.org/download/windows/

## Primera vez (PowerShell, desde la carpeta del proyecto)

```powershell
cd backend
Copy-Item .env.example .env
npm install
```

### Opción A: con Docker

```powershell
npm run db:up
```

Crea un contenedor `clinica-dental-db` con PostgreSQL 17. El `.env` ya apunta a él.

### Opción B: con PostgreSQL instalado

Abre **SQL Shell (psql)** o pgAdmin con el usuario `postgres` y ejecuta:

```sql
CREATE USER clinica WITH PASSWORD 'clinica_dev' CREATEDB;
CREATE DATABASE clinica_dental OWNER clinica;
```

`CREATEDB` hace falta porque Prisma crea una base temporal al generar migraciones.

### Crear las tablas y cargar datos de prueba

```powershell
npm run db:migrate -- --name inicial
npm run db:seed
```

La primera instrucción crea la carpeta `prisma/migrations`: **súbela a Git**, porque es el
historial de cambios de la base de datos.

### Arrancar la API

```powershell
npm run dev
```

Abre http://localhost:3000/api/salud. Debe responder:

```json
{ "estado": "ok", "baseDeDatos": "ok", ... }
```

Para ver las tablas y los datos en el navegador: `npm run db:studio`.

### Si ya tenías la fase 1 instalada

```powershell
git pull
cd backend
npm install                              # nuevas dependencias (jsonwebtoken, zod, cookie-parser)
npm run db:migrate -- --name autenticacion
```

Y agrega a tu `.env` las variables nuevas de `.env.example` (`JWT_SECRET` y `SESION_HORAS`).
Para generar una `JWT_SECRET` segura:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Actualizar a la fase 3.1 (pacientes y citas)

```powershell
git pull
cd backend
npm run db:migrate -- --name busqueda_pacientes
npm run db:seed
```

La migración agrega la columna `textoBusqueda` (búsqueda sin tildes: "macias" encuentra "Macías").
El seed vuelve a cargar los datos de prueba con esa columna llena.

### Actualizar a las fases 3.2 y 3.3 (enfermería y consulta)

No hay migraciones nuevas: basta con `git pull` y reiniciar `npm run dev` en `backend`.

## Usuarios de prueba

La contraseña es la de `SEED_PASSWORD` en tu `.env` (por defecto `Clinica2026!`).

| Rol | Correo |
| --- | --- |
| Administración | admin@live.uleam.edu.ec |
| Recepción | recepcionista@live.uleam.edu.ec |
| Enfermería | enfermera@live.uleam.edu.ec |
| Odontología | odontologa@live.uleam.edu.ec |

## API

Todas las respuestas son JSON. Los errores tienen la forma `{ "error": "mensaje", "detalles": { "campo": "mensaje" } }`.

| Método y ruta | Quién | Qué hace |
| --- | --- | --- |
| `GET /api/salud` | Todos | Estado de la API y de la base de datos |
| `POST /api/auth/login` | Todos | `{ email, password }`. Deja la sesión en una cookie httpOnly |
| `POST /api/auth/logout` | Con sesión | Cierra la sesión |
| `GET /api/auth/yo` | Con sesión | Datos del usuario conectado |
| `POST /api/auth/cambiar-password` | Con sesión | `{ actual, nueva }` |
| `GET /api/usuarios` | Admin | Lista de usuarios |
| `POST /api/usuarios` | Admin | `{ nombre, email, rol, password }`. La contraseña es temporal |
| `PATCH /api/usuarios/:id` | Admin | `{ activo }` para activar o desactivar |
| `POST /api/usuarios/:id/restablecer-password` | Admin | `{ password }` temporal; también desbloquea |
| `GET /api/pacientes?buscar=&limite=` | Con sesión | Busca por nombre o cédula (sin importar tildes) |
| `GET /api/pacientes/:cedula` | Con sesión | Ficha: datos, antecedentes, alertas, odontograma, citas, diagnósticos y recetas. Queda auditado |
| `POST /api/pacientes` | Recepción, Admin | Crea o actualiza un paciente por cédula |
| `PATCH /api/pacientes/:cedula` | Recepción, Admin | Edita datos del paciente |
| `GET /api/citas?fecha=&desde=&hasta=&todas=1&estado=&buscar=` | Con sesión | Lista de citas (por defecto, las de hoy) |
| `POST /api/citas` | Recepción, Admin | `{ paciente, fecha, hora, tipoConsulta, confirmar }`. Rechaza fechas pasadas y horarios ocupados (409) |
| `POST /api/citas/sin-cita` | Recepción, Admin | Paciente que llega sin cita: queda confirmado para enfermería |
| `PATCH /api/citas/:id` | Recepción, Admin | Cambia fecha, hora o tipo (solo pendientes o confirmadas) |
| `POST /api/citas/:id/confirmar` | Recepción, Admin | El paciente llegó |
| `POST /api/citas/:id/no-asistio` | Recepción, Admin | Marca la inasistencia |
| `POST /api/citas/:id/anular` | Recepción, Admin | `{ motivo }`. Las citas no se borran: quedan anuladas con motivo y usuario |
| `GET /api/enfermeria/sala` | Enfermería, Odontología, Admin | Sala de espera (con alergias y antecedentes), preparados, alertas de hoy, últimas tomas y métricas |
| `POST /api/enfermeria/citas/:id/signos` | Enfermería, Admin | `{ presion: "120/80", pulso, temperatura, observaciones }`. Evalúa según la edad, crea las alertas y pasa la cita a preparada. 409 si otra persona ya lo registró |

| `GET /api/consultas/agenda` | Odontología, Admin | Pacientes preparados de hoy, atendidos, procedimientos del mes |
| `GET /api/consultas/:citaId` | Odontología, Admin | Paciente, signos, alertas, antecedentes, historial, odontograma y recetas de la cita |
| `POST /api/consultas/:citaId/diagnosticos` | Odontología | `{ piezas: "16, 26", procedimiento, descripcion, notas, estado }`. Piezas en numeración FDI |
| `PUT /api/consultas/:citaId/odontograma/:pieza` | Odontología | `{ estado }`: SANO, CARIES, TRATADO, OBSERVACION o AUSENTE |
| `DELETE /api/consultas/:citaId/odontograma/:pieza` | Odontología | Quita la marca de esa pieza hecha en esta consulta |
| `DELETE /api/consultas/:citaId/odontograma` | Odontología | Quita todas las marcas de esta consulta |
| `POST /api/consultas/:citaId/recetas` | Odontología | `{ medicamentos: [{ medicamento, dosis, frecuencia, duracion }], indicaciones, confirmarAlergias }`. Número RX-AAAAMMDD-0001. También después de finalizar |
| `POST /api/consultas/:citaId/finalizar` | Odontología | La cita queda atendida |

### Odontograma

Cada visita guarda sus propias marcas. Lo que se muestra es la marca más reciente de cada pieza,
así que quitar una marca de hoy no borra la historia: la pieza vuelve a lo que tenía en la visita anterior.

### Recetas y alergias

Una receta puede tener hasta 10 medicamentos (el formulario permite 5). No se editan: quedan con su número.
Si un medicamento coincide con una alergia registrada (por nombre o por grupo, como penicilinas o AINE),
la API responde 409 hasta que la odontóloga confirme con `confirmarAlergias: true`. La confirmación queda en la auditoría.
Las reglas están en [`shared/alergias.js`](../shared/alergias.js). Es una ayuda: no reemplaza el criterio clínico.

### Signos vitales y alertas

Las reglas están en [`shared/signosVitales.js`](../shared/signosVitales.js), en la raíz del repositorio.
El formulario las usa para la vista previa y la API para guardar, así que las dos siempre coinciden.
La edad se calcula en el servidor con la fecha de nacimiento del paciente; no se confía en la que envíe el navegador.
Las observaciones que mencionan una alergia crean una alerta, salvo frases que la niegan ("niega alergias", "sin alergias conocidas").

Por esa carpeta compartida, si algún día armas una imagen de Docker del backend, el contexto de construcción debe ser la raíz del repositorio.

### Seguridad

- Contraseñas cifradas con **bcrypt**; nunca se envían al frontend.
- La sesión es un **JWT dentro de una cookie httpOnly** (el JavaScript del navegador no puede leerla). Dura `SESION_HORAS`.
- En cada petición se vuelve a consultar al usuario: si se desactiva o cambia de rol, aplica al instante.
- **5 intentos fallidos** seguidos bloquean el usuario **15 minutos**.
- Un usuario con contraseña temporal solo puede cambiarla; el resto de rutas responde 403.
- Cada inicio de sesión (correcto o fallido), cierre y cambio queda en la tabla `auditoria`, igual que cada ficha consultada y cada cita creada, editada o anulada.
- Las fechas se guardan en UTC y se interpretan en hora de Ecuador (UTC-5).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Arranca la API y la reinicia al guardar cambios |
| `npm run db:up` / `db:down` | Enciende o apaga PostgreSQL en Docker |
| `npm run db:migrate` | Aplica cambios del `schema.prisma` y crea una migración |
| `npm run db:seed` | Borra los datos clínicos y carga los de prueba |
| `npm run db:reset` | Borra toda la base, aplica las migraciones y ejecuta el seed |
| `npm run db:studio` | Abre Prisma Studio para ver y editar datos |

## Estructura

```
backend/
├── prisma/
│   ├── schema.prisma    modelo de datos (tablas, relaciones, enums)
│   └── seed.js          datos de prueba
├── src/
│   ├── config/env.js    variables de entorno (falla al arrancar si falta alguna)
│   ├── lib/             cliente de Prisma y errores de la API
│   ├── middlewares/     manejo central de errores
│   ├── routes/          rutas de la API
│   ├── app.js           aplicación Express (seguridad, CORS, JSON, rutas)
│   └── server.js        arranque y cierre ordenado
└── docker-compose.yml   PostgreSQL para desarrollo
```

## Modelo de datos

| Tabla | Para qué sirve |
| --- | --- |
| `usuarios` | Personal con su rol; contraseñas cifradas con bcrypt |
| `pacientes` | Con **fecha de nacimiento** (la edad se calcula) y contacto de emergencia |
| `antecedentes` | Enfermedades, medicación, alergias, cirugías, embarazo, hábitos |
| `citas` | Con hora de cada etapa del flujo y **anulación en lugar de borrado** |
| `signos_vitales` | Presión, pulso, temperatura, frecuencia respiratoria, saturación, peso y talla |
| `alertas_medicas` | Alertas por signos fuera de lo normal, alergias o antecedentes, con severidad |
| `diagnosticos` | Procedimientos por pieza y su estado |
| `marcas_odontograma` | Odontograma **por visita y por cara** del diente |
| `recetas` y `receta_medicamentos` | Recetas con varios medicamentos; se anulan, no se editan |
| `consentimientos` | Texto aceptado y firmante (paciente o representante) |
| `recordatorios` | Avisos de cita por correo o WhatsApp |
| `auditoria` | Quién vio o cambió qué y cuándo (solo se insertan filas) |

## Problemas comunes

- **`P1001: Can't reach database server`**: PostgreSQL no está encendido. Con Docker, ejecuta `npm run db:up` y revisa que Docker Desktop esté abierto.
- **`P1000: Authentication failed`**: el usuario o la clave de `DATABASE_URL` en `.env` no coinciden con los de tu PostgreSQL.
- **El puerto 5432 está ocupado**: ya tienes otro PostgreSQL. Usa ese (opción B) o cambia el puerto en `docker-compose.yml` y en `DATABASE_URL`.
- **`Falta la variable de entorno JWT_SECRET`**: copia las variables nuevas de `.env.example` a tu `.env`.
- **`The table ... does not exist`**: faltan migraciones. Ejecuta `npm run db:migrate`.
- **El login dice "No se pudo conectar con el servidor"**: el backend no está encendido (`npm run dev` en `backend`).
- **`npm` no se reconoce o no puede ejecutar scripts**: mira la sección de Node.js del README principal.
