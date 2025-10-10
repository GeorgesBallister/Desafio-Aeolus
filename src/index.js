//* Importa as dependências
import express from 'express';
import dotenv from 'dotenv';
import camerasRoutes from '../src/routes/cameras.js';
import eventsRouter from '../src/routes/events.js';

//* Carregar as variaveis de ambiente do arquivo .env
dotenv.config();

//* Express
const app = express();

//* Middleware para interpretar JSON
app.use(express.json());

//* === Rotas ===
app.use('/cameras', camerasRoutes);

// * Definir a porta do servidor
const PORT = process.env.PORT || 3000;

// * Iniciar o servidor na porta definida
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});