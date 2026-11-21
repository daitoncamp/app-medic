# App Medic: Sistema de gestión dental

Aplicación web para la clínica odontológica de la ULEAM. Organiza la atención de un paciente en tres etapas, cada una con su propio rol:

1. **Recepcionista**: registra pacientes, agenda y confirma citas, y descarga reportes.
2. **Enfermera**: recibe a los pacientes confirmados, registra sus signos vitales y genera alertas médicas.
3. **Odontóloga**: atiende a los pacientes preparados, registra el diagnóstico en el odontograma y exporta la ficha en PDF.

## Tecnologías

- React 19 + Vite 7
- React Router 7
- Font Awesome (íconos)
- jsPDF (fichas en PDF)

## Cómo ejecutarlo

```bash
npm install
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # compilación de producción en dist/
npm run preview   # sirve la compilación localmente
npm run lint      # revisa el código con ESLint
```

Copia `.env.example` como `.env` cuando haya un backend que configurar.

## Usuarios de demostración

| Rol | Correo | Clave |
| --- | --- | --- |
| Recepcionista | recepcionista@live.uleam.edu.ec | 1234 |
| Enfermera | enfermera@live.uleam.edu.ec | 1234 |
| Odontóloga | odontologa@live.uleam.edu.ec | 1234 |

> Son solo para pruebas locales. Viven en `src/services/authService.js` y hay que eliminarlos al conectar un backend real.

## Estructura

```
src/
├── assets/          imágenes (logo)
├── components/      componentes reutilizables (ProtectedRoute)
├── hooks/           hooks de React (useAuth)
├── logic/           lógica de cada dashboard (un hook por rol)
├── pages/           pantallas: inicio, logins y dashboards
├── services/        authService: login, sesión y roles
└── utils/           syncUtils: capa de datos compartida entre roles
```

## Estado actual y limitaciones

- **Sin base de datos todavía.** Los datos se guardan en el `localStorage` del navegador (`src/utils/syncUtils.js`). Cada equipo tiene sus propios datos y se pierden al limpiar el navegador.
- **Autenticación de demostración.** Las rutas de cada dashboard ya están protegidas por rol (`ProtectedRoute`), pero la validación ocurre en el navegador. Para producción tiene que hacerla un backend.

## Próximos pasos hacia producción

1. Conectar un backend con base de datos y autenticación (por ejemplo Supabase con PostgreSQL).
2. Reemplazar `iniciarSesion` en `authService.js` por la llamada al backend.
3. Convertir las funciones de `syncUtils.js` en llamadas `async` a la API. Los dashboards ya las consumen desde un solo archivo, así que casi no cambian.
4. Tablas sugeridas: `usuarios`, `pacientes`, `citas` (con estado), `signos_vitales`, `diagnosticos` y `alertas_medicas`.
5. Agregar pruebas (Vitest) y desplegar el frontend en Vercel o Netlify.

Al manejar datos de salud, hace falta cumplir la Ley Orgánica de Protección de Datos Personales de Ecuador: HTTPS, control de acceso, registro de accesos y respaldos.
