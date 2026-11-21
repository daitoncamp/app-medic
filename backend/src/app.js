// ==================== APLICACIÓN EXPRESS ====================
// Se separa de server.js para poder probar la app sin abrir un puerto.

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { autenticar, requierePasswordDefinitiva } from './middlewares/auth.js';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores.js';
import { rutasAuth } from './routes/auth.js';
import { rutasCitas } from './routes/citas.js';
import { rutasConsultas } from './routes/consultas.js';
import { rutasEnfermeria } from './routes/enfermeria.js';
import { rutasPacientes } from './routes/pacientes.js';
import { rutasSalud } from './routes/salud.js';
import { rutasUsuarios } from './routes/usuarios.js';

export const app = express();

app.disable('x-powered-by');
// Detrás de un proxy (Render, Nginx…) para que req.ip sea la IP real del cliente
if (config.esProduccion) app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.corsOrigenes, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ===== Rutas públicas =====
app.use('/api/salud', rutasSalud);
app.use('/api/auth', rutasAuth);

// ===== Rutas protegidas: exigen sesión y contraseña definitiva =====
const protegida = [autenticar, requierePasswordDefinitiva];
app.use('/api/usuarios', ...protegida, rutasUsuarios);
app.use('/api/pacientes', ...protegida, rutasPacientes);
app.use('/api/citas', ...protegida, rutasCitas);
app.use('/api/enfermeria', ...protegida, rutasEnfermeria);
app.use('/api/consultas', ...protegida, rutasConsultas);

app.use(rutaNoEncontrada);
app.use(manejarErrores);
