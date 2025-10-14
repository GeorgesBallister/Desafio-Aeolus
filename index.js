//* Importa as dependências
import express from 'express';
import dotenv from 'dotenv';
import camerasRouter from './src/routes/cameras.js';
import eventsRouter from './src/routes/events.js';

//! Da pra rodar tudo junto mas é melhor separar em arquivos diferentes e rodar pelo npm scripts que eu desenvolvi com o "concurrently", porque assim cada mensagem de cada serviço fica mais clara no console
// import './src/services/createBucket.js'; // Importa o script para criar o bucket no MinIO 
// import './src/services/kafkaConsumer.js'; // Importa o script do consumidor Kafka 

//* Carregar as variaveis de ambiente do arquivo .env
dotenv.config();

//* Express
const app = express();

//* Middleware para interpretar JSON
app.use(express.json());

//* === Rotas ===
app.use('/cameras', camerasRouter);
app.use('/eventos', eventsRouter)

// * Definir a porta do servidor
const PORT = process.env.PORT || 3000;

// * Iniciar o servidor na porta definida
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});