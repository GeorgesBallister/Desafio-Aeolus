//* ============ App Express exportável ============
import express from 'express';
import dotenv from 'dotenv';
import camerasRouter from './routes/cameras.js';
import eventsRouter from './routes/events.js';

// Carrega variáveis de ambiente
dotenv.config();

// Cria app
const app = express();

// Middlewares
app.use(express.json());

// Rotas
app.use('/cameras', camerasRouter);
app.use('/eventos', eventsRouter);

export default app;
