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

//* ------------- /eventos -------------

//* GET /eventos - Retorna todos os eventos
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

//* GET /eventos/:id/image-url - Retorna URL assinada da imagem do evento
router.get('/:eventId/image-url', async (req, res) => {
    try {
        // 1. Monta a query para buscar o evento pelo eventId (escapado)
        const query = `SELECT * FROM events WHERE eventId = '${chEscape(req.params.eventId)}' FORMAT JSON`;
        // 2. Executa a query no ClickHouse
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        // 3. Valida se encontrou o evento
        const eventos = response.data.data;

        // 4. Se não encontrou evento, retorna 404
        if (!eventos || eventos.length === 0) {
            return res.status(404).json({ error: "Evento nao encontrado" });
        }
        // 5. Pega o caminho da imagem do evento
        const imagePath = eventos[0].image_path; // 5.1 Pega o caminho da imagem do primeiro evento que recebeu na consulta (deveria ser único)

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
 
//* GET /eventos/filter - Busca eventos com filtros de data e paginação
router.get('/filter', async (req, res) => {
    try {
        // 1 Extrai filtros da query string
        const { 
            from, // Data inicial (timestamp)
            to, // Data final (timestamp)
            limit = 20, // Limite de resultados
            offset = 0, // Offset para paginação
            cameraID // ID da câmera
        } = req.query;

        // 2 Monta condições do WHERE
        let where = []; // 2.1 Este array vai armazenar as condições do WHERE se elas forem fornecidas pelo usuário através dos parâmetros da query string no http request.
        if (from) where.push(`timestamp >= '${chEscape(from)}'`); // 2.2 Se from possuir algum valor, adiciona a condição de timestamp maior ou igual ao valor escapado.
        if (to) where.push(`timestamp <= '${chEscape(to)}'`); // 2.3 Se to possuir algum valor, adiciona a condição de timestamp menor ou igual ao valor escapado.
        if (cameraID) where.push(`cameraID = '${chEscape(cameraID)}'`); // 2.4 Se cameraID possuir algum valor, adiciona a condição de cameraID igual ao valor fornecido.
        const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : ''; // 2.5 Operador ternário que monta a cláusula WHERE se houver condições, usando AND na separação de cada condição, ou string vazia se não houver.

        // 3 Monta a query com paginação
        const query = `SELECT * FROM events ${whereClause} ORDER BY timestamp DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)} FORMAT JSON`; // Query final com paginação

        // 4 Executa a query
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        // 5 Retorna os dados encontrados
        res.status(200).json(response.data.data);
    } catch (error) {
        // 6 Em caso de erro, retorna status 400
        res.status(400).json({ Erro: error.message });
    }           
}); 


//* ------------- /eventos/camera -------------

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

//* GET /events/camera/:cameraID/latest - Últimos  eventos por câmera (limitável)
router.get('/camera/:cameraID/latest', async (req, res) => {
    try {
        // 1 Extrai o cameraID e o limit da query string
        const { cameraID } = req.params;
        const limit = Number(req.query.limit) || 10;
        // 2 Monta a query para pegar os últimos eventos dessa câmera
        const query = `SELECT * FROM events WHERE cameraID = '${ (cameraID)}' ORDER BY timestamp DESC LIMIT ${limit} FORMAT JSON`;
        // 3 Executa a query
        const response = await clickhouseAxios(`/?query=${encodeURIComponent(query)}`);
        // 4 Retorna os dados encontrados
        res.status(200).json(response.data.data);
    } catch (error) {
        // 5 Em caso de erro, retorna status 400
        res.status(400).json({ Erro: error.message });
    }
});


//* GET /eventos/test - Testa as tabelas do ClickHouse 
//! Debug
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





//* Exporta o router
export default router;