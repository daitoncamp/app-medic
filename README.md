# App Medic: Sistema de gestión dental

Aplicación web para la clínica odontológica de la Uleam. Cada paciente pasa por tres etapas, y cada rol ve solo lo que le toca:

1. **Recepción**: agenda (en lista o calendario), confirma y da seguimiento a las citas, envía recordatorios por WhatsApp y mantiene los datos de los pacientes. Registra pacientes que llegan sin cita.
2. **Enfermería**: toma los signos vitales de los pacientes en espera. Las alergias generan alertas médicas.
3. **Odontología**: diagnostica, marca el odontograma, genera recetas e historiales en PDF y finaliza la consulta.
4. **Administración**: ve las métricas generales y gestiona los usuarios del personal.

Todos los roles tienen una pantalla de **Inicio** con las métricas de su día y acceso a la **ficha del paciente**, que muestra todo su historial en una línea de tiempo.

## Tecnologías

- React 19 + Vite 7
- React Router 7
- CSS Modules con variables de diseño (sin librerías de estilos)
- Font Awesome (íconos) y jsPDF (documentos PDF)

## Cómo ejecutarlo

El login usa la API, así que primero hay que encender el backend (ver [backend/README.md](backend/README.md)).
Usa dos ventanas de PowerShell:

```bash
# Ventana 1: API
cd backend
npm run dev       # http://localhost:3000

# Ventana 2: frontend
npm install
npm run dev       # http://localhost:5173 (las llamadas a /api pasan al backend)
npm run build     # compilación de producción en dist/
npm run preview   # sirve la compilación localmente
npm run lint      # revisa el código con ESLint
npm test          # pruebas con Vitest (reglas clínicas compartidas y utilidades)
npm run typecheck # revisa los tipos de TypeScript
```

### Pruebas e integración continua

- `npm test` en la raíz prueba las reglas de `shared/` (signos vitales, alergias, odontograma, procedimientos) y utilidades del frontend.
- `npm test` en `backend/` prueba fechas, validaciones y el cierre del día. La prueba de la API (`backend/tests/api.test.js`) recorre el flujo completo contra PostgreSQL y solo corre con `RUN_API_TESTS=1`, porque modifica datos.
- GitHub Actions (`.github/workflows/ci.yml`) ejecuta en cada push y pull request: lint, pruebas y build del frontend; y en el backend crea un PostgreSQL 17 vacío, aplica las migraciones, carga el seed y corre todas las pruebas, incluida la de la API.

## Usuarios de demostración

Hay un solo inicio de sesión: el servidor sabe qué rol tiene cada usuario y lo lleva a su panel.
Los crea el seed del backend (`npm run db:seed`) con la contraseña de `SEED_PASSWORD` (por defecto `Clinica2026!`).

| Rol | Correo |
| --- | --- |
| Recepción | recepcionista@live.uleam.edu.ec |
| Enfermería | enfermera@live.uleam.edu.ec |
| Odontología | odontologa@live.uleam.edu.ec |
| Administración | admin@live.uleam.edu.ec |

Los usuarios que crea el administrador reciben una contraseña temporal y deben cambiarla en su primer ingreso.

## Estructura

```
src/
├── App.jsx                 rutas de la app
├── main.jsx                punto de entrada
├── styles/
│   ├── tokens.css          variables de diseño (colores, espacios, color de cada rol)
│   └── base.css            estilos globales mínimos
├── components/
│   ├── ui/                 componentes reutilizables: Button, Card, Modal, ConfirmDialog,
│   │                       Toast, Field, Table, Tabs, StatCard, BarChart, ...
│   ├── layout/             AppLayout (menú lateral + barra superior) y menú por rol
│   └── ProtectedRoute.jsx  protege las rutas según la sesión y el rol
├── features/               una carpeta por funcionalidad
│   ├── auth/               inicio de sesión
│   ├── dashboard/          Inicio de cada rol y cálculo de métricas
│   ├── citas/              agenda de recepción
│   ├── enfermeria/         sala de espera y signos vitales
│   ├── consulta/           diagnóstico, odontograma, receta y PDFs
│   ├── pacientes/          listado y ficha del paciente
│   └── usuarios/           gestión de usuarios (administración)
├── hooks/                  useRecurso (carga de la API con actualización periódica) y useDiferido
├── services/
│   ├── api.ts              fetch a /api con la cookie de sesión y errores en español
│   ├── authService.ts      login, sesión, roles y usuarios
│   ├── recepcionApi.ts     pacientes, citas y ficha
│   ├── enfermeriaApi.ts    sala de espera y signos vitales
│   ├── consultaApi.ts      agenda, diagnósticos, odontograma, recetas
│   ├── recordatoriosApi.ts recordatorios por WhatsApp y SMS
│   └── clinica.ts          constantes compartidas (estados de cita, fechas)
├── types/
│   ├── api.ts              forma del JSON que envía el backend
│   └── dominio.ts          datos que usan las pantallas (Cita, Paciente, Alerta…)
└── utils/                  validaciones y formatos de fecha
shared/                     reglas que usan el frontend y el backend:
├── signosVitales.js        rangos por edad y alertas
├── alergias.js             aviso de alergia al recetar
├── procedimientos.js       lista única de procedimientos y tipos de cita
├── consentimientos.js      plantillas del consentimiento informado
└── odontograma.js          combinación de marcas por diente y por caras
```

### Diseño

- Cada rol tiene su color de acento: azul para recepción, verde para enfermería, morado para odontología y rojo Uleam para administración. Lo cambia el atributo `data-rol` del layout, así que los componentes no repiten colores.
- Las tablas se convierten en tarjetas en pantallas pequeñas y el menú lateral pasa a ser un panel deslizable.
- Los formularios usan `Field`, que asocia cada etiqueta con su campo y anuncia los errores a los lectores de pantalla.

## Estado actual

- **Todo en el servidor (PostgreSQL):** usuarios y sesión, pacientes, citas, sala de espera, signos vitales, alertas, consulta, diagnósticos, odontograma y recetas. El flujo recepción → enfermería → odontología funciona entre computadoras distintas.
- La app ya no guarda datos clínicos en el navegador. Al abrir esta versión se borran los datos que dejaron en `localStorage` las versiones anteriores.

## Backend

El servidor está en la carpeta [`backend/`](backend/README.md) (Node.js + Express + PostgreSQL + Prisma).
Sus instrucciones de instalación están en su propio README.

Plan de trabajo:

1. **Base del backend**: estructura, modelo de datos y datos de prueba (hecho)
2. **Autenticación**: contraseñas cifradas, sesión en cookie, roles en el servidor, bloqueo por intentos y auditoría (hecho)
3. **API clínica y conexión del frontend**: pacientes y citas, enfermería y signos vitales, consulta, odontograma y recetas (hecho)
4. **Mejoras clínicas**: fecha de nacimiento, frecuencia respiratoria y saturación, antecedentes, consentimiento informado, odontograma por caras y lista ampliada de procedimientos (hecho)
5. **Operación**: calendario por semana y mes, recordatorios por WhatsApp y SMS, cierre automático del día y edición de pacientes (hecho)
6. **Calidad**: pruebas con Vitest, CI en GitHub Actions y Prisma 7 (hecho); pendiente: TypeScript

Al manejar datos de salud hay que cumplir la Ley Orgánica de Protección de Datos Personales de Ecuador: HTTPS, control de acceso por rol en el servidor, registro de accesos y respaldos.
