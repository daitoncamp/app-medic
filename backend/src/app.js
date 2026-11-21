// ==================== APLICACIÓN EXPRESS ====================
// Se separa de server.js para poder probar la app sin abrir un puerto.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores.js';
import { rutasSalud } from './routes/salud.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.corsOrigenes, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Rutas de la API (las siguientes fases agregan auth, pacientes, citas, etc.)
app.use('/api/salud', rutasSalud);

app.use(rutaNoEncontrada);
app.use(manejarErrores);
