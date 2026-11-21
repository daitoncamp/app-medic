# App Medic: Sistema de gestión dental

Aplicación web para la clínica odontológica de la Uleam. Cada paciente pasa por tres etapas, y cada rol ve solo lo que le toca:

1. **Recepción**: agenda, confirma y da seguimiento a las citas. Registra pacientes que llegan sin cita.
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
```

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
├── hooks/useClinica.js     datos de la clínica, actualizados en vivo
├── services/
│   ├── clinica.js          capa de datos (hoy localStorage, mañana la API)
│   └── authService.js      login, sesión, roles y usuarios
└── utils/                  validaciones y formatos de fecha compartidos
```

### Diseño

- Cada rol tiene su color de acento: azul para recepción, verde para enfermería, morado para odontología y rojo Uleam para administración. Lo cambia el atributo `data-rol` del layout, así que los componentes no repiten colores.
- Las tablas se convierten en tarjetas en pantallas pequeñas y el menú lateral pasa a ser un panel deslizable.
- Los formularios usan `Field`, que asocia cada etiqueta con su campo y anuncia los errores a los lectores de pantalla.

## Estado actual

- **Sin base de datos todavía.** Los datos se guardan en el `localStorage` del navegador. Si abres la app en dos pestañas, se sincronizan solas, pero cada computadora tiene sus propios datos.
- **Usuarios y sesión ya están en el servidor.** Los datos clínicos (citas, signos, consultas) todavía usan `localStorage` hasta la fase 3.

## Backend

El servidor está en la carpeta [`backend/`](backend/README.md) (Node.js + Express + PostgreSQL + Prisma).
Sus instrucciones de instalación están en su propio README.

Plan de trabajo:

1. **Base del backend**: estructura, modelo de datos y datos de prueba (hecho)
2. **Autenticación**: contraseñas cifradas, sesión en cookie, roles en el servidor, bloqueo por intentos y auditoría (hecho)
3. API de citas, pacientes, signos vitales, consulta y documentos, y conexión del frontend
4. Mejoras clínicas: fecha de nacimiento, frecuencia respiratoria y saturación, antecedentes, consentimiento, odontograma por caras
5. Operación: agenda en calendario, recordatorios, cierre automático del día, edición de pacientes
6. Calidad: pruebas con Vitest, CI en GitHub Actions y TypeScript

## Conectar el backend

La app está preparada para que el cambio toque pocos archivos:

1. `services/authService.js`: reemplazar `iniciarSesion`, `listarUsuarios`, `crearUsuario` y `cambiarEstadoUsuario` por llamadas a la API. El servidor debe devolver el rol del usuario dentro del token.
2. `services/clinica.js`: convertir cada función en una llamada a la API (`registrarNuevaCita`, `confirmarCita`, `registrarSignosVitales`, `registrarDiagnostico`, `finalizarConsulta`, etc.).
3. `hooks/useClinica.js`: pedir los datos a la API y escuchar cambios en tiempo real (WebSocket o consultas periódicas).
4. `utils/validaciones.js` son funciones puras: se pueden copiar tal cual al backend si es Node.

Tablas sugeridas: `usuarios`, `pacientes`, `citas` (con estado: Pendiente, Confirmada, En consulta, Atendida, No asistió), `signos_vitales`, `diagnosticos`, `odontogramas` y `alertas_medicas`.

Al manejar datos de salud hay que cumplir la Ley Orgánica de Protección de Datos Personales de Ecuador: HTTPS, control de acceso por rol en el servidor, registro de accesos y respaldos.
