//* ============ Dependências e Instâncias ============
import { Router } from 'express'; 
import axios from 'axios'; 
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

//* Instancia o Router do Express
const router = Router();

//* Instancia o cliente S3 para MinIO
const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT, 
  region: 'us-east-1', 
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER, 
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD 
  },
  forcePathStyle: true 
});

//* Instancia o axios para ClickHouse
const clickhouseAxios = axios.create({
  baseURL: process.env.CLICKHOUSE_URL, 
  auth: {
    username: 'default',
    password: 'admin' 
  }
});

//* Função auxiliar para escapar aspas simples em strings do ClickHouse
const chEscape = (val = '') => String(val).replace(/'/g, "''"); // Substitui aspas simples por duas aspas simples


//* ============ Rotas de eventos ============

//* GET /events - Retorna todos os eventos
router.get('/', async (req, res) => {
    try {
        // 1. Monta a query para buscar todos os eventos
        const query = 'SELECT * FROM events FORMAT JSON';
        // 2. Executa a query no ClickHouse
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        // 3. Retorna os dados encontrados
        res.status(200).json(response.data.data);
    } catch (error) {
        // 4. Em caso de erro, retorna status 400
        res.status(400).json({ Erro: error.message });
    }
});

//* GET /eventos/camera/:cameraID - Retorna eventos de uma câmera específica
router.get('/camera/:cameraID', async (req, res) => {
    try {
        // 1. Monta a query filtrando pelo cameraID (escapado)
        const query = `SELECT * FROM events WHERE cameraID = '${chEscape(req.params.cameraID)}' FORMAT JSON`;
        // 2. Executa a query no ClickHouse
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        // 3. Retorna os dados encontrados
        res.status(200).json(response.data.data);
    } catch (error) {
        // 4. Em caso de erro, retorna status 400
        res.status(400).json({ Erro: error.message });
    }
});

//* GET /eventos/:id/image-url - Retorna URL assinada da imagem do evento
router.get('/:id/image-url', async (req, res) => {
    try {
        // 1. Monta a query para buscar o evento pelo eventId (escapado)
        const query = `SELECT * FROM events WHERE eventId = '${chEscape(req.params.id)}' FORMAT JSON`;
        // 2. Executa a query no ClickHouse
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        // 3. Valida se encontrou o evento
        const eventos = response.data.data;

        // 4. Se não encontrou evento, retorna 404
        if (!eventos || eventos.length === 0) {
            return res.status(404).json({ error: "Evento nao encontrado" });
        }
        // 5. Pega o caminho da imagem do evento
        const imagePath = eventos[0].image_path;

        // 6. Monta o comando para buscar o objeto no MinIO
        const command = new GetObjectCommand({
            Bucket: process.env.MINIO_BUCKET, // 6.1 Nome do bucket
            Key: imagePath // 6.2 Caminho do arquivo
        });

        // 6.3 Gera a URL assinada para download da imagem (5 min)
        const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
        // 6.4 Retorna a URL
        res.json({ url });
    } catch (error) {
        // 6.5 Em caso de erro, retorna status 400
        res.status(400).json({ Erro: error.message });
    }
});

//* GET /eventos/:id - Retorna evento pelo eventId
router.get('/:id', async (req, res) => {
    try {
        // 1. Monta a query para buscar o evento pelo eventId (escapado)
        const query = `SELECT * FROM events WHERE eventId = '${chEscape(req.params.id)}' FORMAT JSON`;
        // 2. Executa a query no ClickHouse
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        // 3. Retorna os dados encontrados
        res.status(200).json(response.data.data);
    } catch (error) {
        // 4. Em caso de erro, retorna status 400
        res.status(400).json({ Erro: error.message });
    }
});

//* GET /eventos/test - Testa as tabelas do ClickHouse
router.get("/test", async (req, res) => {
    try {
        // 1. Monta a query para mostrar as tabelas
        const query = 'SHOW TABLES';
        // 2. Executa a query no ClickHouse
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        // 3. Retorna o resultado
        res.status(200).json(response.data);
    } catch (error) {
        // 4. Em caso de erro, retorna status 400
        res.status(400).json({ Erro: error.message });
    }
});


//* GET /events/filter - Busca eventos com filtros de data e paginação
router.get('/filter', async (req, res) => {
    try {
        // 1 Extrai filtros da query string
        const { from, to, limit = 20, offset = 0, cameraID } = req.query;
        // 2 Monta condições do WHERE
        let where = [];
        if (from) where.push(`timestamp >= '${chEscape(from)}'`);
        if (to) where.push(`timestamp <= '${chEscape(to)}'`);
        if (cameraID) where.push(`cameraID = '${chEscape(cameraID)}'`);
        const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
        // 3 Monta a query com paginação
        const query = `SELECT * FROM events ${whereClause} ORDER BY timestamp DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)} FORMAT JSON`;
        // 4 Executa a query
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        // 5 Retorna os dados encontrados
        res.status(200).json(response.data.data);
    } catch (error) {
        // 6 Em caso de erro, retorna status 400
        res.status(400).json({ Erro: error.message });
    }
});

//* GET /events/camera/:cameraID/latest - Últimos eventos por câmera (limitável)
router.get('/camera/:cameraID/latest', async (req, res) => {
    try {
        // 1 Extrai o cameraID e o limit da query string
        const { cameraID } = req.params;
        const limit = Number(req.query.limit) || 10;
        // 2 Monta a query para pegar os últimos eventos dessa câmera
        const query = `SELECT * FROM events WHERE cameraID = '${chEscape(cameraID)}' ORDER BY timestamp DESC LIMIT ${limit} FORMAT JSON`;
        // 3 Executa a query
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        // 4 Retorna os dados encontrados
        res.status(200).json(response.data.data);
    } catch (error) {
        // 5 Em caso de erro, retorna status 400
        res.status(400).json({ Erro: error.message });
    }
});


//* Exporta o router
export default router;