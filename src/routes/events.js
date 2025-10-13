// * Importações
import { Router } from 'express';
import axios from 'axios';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';


// Instancia o Prisma Client e o Router do Express
const router = Router();

// Configurando o S3
const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY
  },
  forcePathStyle: true
});

// Configuração do axios:
const clickhouseAxios = axios.create({
  baseURL: process.env.CLICKHOUSE_URL,
  auth: {
    username: 'default',
    password: 'admin'
  }
});


// ! O Objetivo aqui é fazer as consultas do clickhouse com o axios

// Criar Get /events = Get all events
router.get('/', async (req,res) => {
    try {
        const query = 'SELECT * FROM events FORMAT JSON';
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        res.status(200).json(response.data.data);
    } catch (error) {
        res.status(400).json({ Erro: error.message });
    }
});

// Criar Get /events/:id
router.get('/:id', async (req,res) => {
    try {
        const query = `SELECT * FROM events WHERE eventId = '${req.params.id}' FORMAT JSON`;
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        res.status(200).json(response.data.data);
    } catch (error) {
        res.status(400).json({ Erro: error.message });
    }
});

// Criar Get /events/camera/:cameraID
router.get('/camera/:cameraID', async (req,res) => {
    try {
        const query =` SELECT * FROM events WHERE cameraID = '${req.params.cameraID}'  FORMAT JSON`;
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        res.status(200).json(response.data.data);
    } catch (error) {
        res.status(400).json({ Erro: error.message });
    }
});

// Criar Get /events/:id/image-url
router.get('/:id/image-url', async (req,res) => {
    try {
        const query = `SELECT * FROM events WHERE eventId = '${req.params.id}' FORMAT JSON`;
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        // Validação
        const eventos = response.data.data;

        if(!eventos || eventos.length === 0){
            return res.status(404).json({error:"Evento nao encontrado"});
        }
        const imagePath = eventos[0].imagePath;

        const command = new GetObjectCommand({
            Bucket: process.env.MINIO_BUCKET,
            Key: imagePath
        });

            const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // 5 minutos
        res.json({ url });
    } catch (error) {
        res.status(400).json({ Erro: error.message });
    }
});

// Testar as tabelas
router.get("/test", async (req, res) =>{
    try {
        const query = 'SHOW TABLES'
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(400).json({ Erro: error.message });
    }
});
export default router;