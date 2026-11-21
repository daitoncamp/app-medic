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

### Seguridad

- Contraseñas cifradas con **bcrypt**; nunca se envían al frontend.
- La sesión es un **JWT dentro de una cookie httpOnly** (el JavaScript del navegador no puede leerla). Dura `SESION_HORAS`.
- En cada petición se vuelve a consultar al usuario: si se desactiva o cambia de rol, aplica al instante.
- **5 intentos fallidos** seguidos bloquean el usuario **15 minutos**.
- Un usuario con contraseña temporal solo puede cambiarla; el resto de rutas responde 403.
- Cada inicio de sesión (correcto o fallido), cierre y cambio queda en la tabla `auditoria`.

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
