//* ============ Dependências e Instâncias ============
import 'dotenv/config';
import { Kafka } from 'kafkajs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();



//* Configuração do Kafka
const kafka = new Kafka({
    clientId: 'aeolus-app', // Identificador do cliente Kafka
    brokers: [process.env.KAFKA_BROKER] // Lista de brokers (pega do .env)
});



//* Cria o consumidor Kafka e define o grupo
const consumer = kafka.consumer({
    groupId: 'aeolus-group' // Nome do grupo de consumidores
});



//* Configuração do MinIO (S3)
const s3 = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT, // URL do MinIO (pega do .env)
    region: 'us-east-1', // Região padrão (MinIO ignora)
    credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER, // Usuário do MinIO
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD // Senha do MinIO
    },
    forcePathStyle: true // Obrigatório para MinIO (compatibilidade S3)
});




//* 1. Função principal do consumer Kafka
async function runConsumer() {
    // 1.1 Log inicial
    console.log("Rodando o consumer");

    // 1.2 Conecta o consumidor ao broker Kafka
    await consumer.connect();

    // 1.3 Inscreve o consumidor no tópico 'device-events' (apenas mensagens novas)
    await consumer.subscribe({
        topic: 'device-events', // 1.3.1 Nome do tópico
        fromBeginning: false // 1.3.2 true = lê tudo desde o início
    });

    // 1.4 Inicia o loop de processamento de mensagens
    await consumer.run({
        // 1.4.1 Para cada mensagem recebida do Kafka:
        eachMessage: async ({ topic, partition, message }) => {
            // 1.4.1.1 Log de recebimento
            console.log('Mensagem recebida do Kafka!');
            try {
                // 1.4.2 Converte o buffer da mensagem para string e depois para objeto JSON
                const evento = JSON.parse(message.value.toString());

                // 1.4.3 Loga campos principais do evento para debug
                console.log('[evento recebido]', {
                    deviceId: evento?.deviceId,
                    cameraID: evento?.cameraID,
                    eventId: evento?.eventId,
                    timestamp: evento?.timestamp,
                    hasImage: !!(evento?.image && evento?.image.base64)
                });

                // 1.4.4 Validação: só processa eventos de câmeras cadastradas no MongoDB
                // 1.4.4.1 Armazena o deviceId ou cameraID ou 'unknown-device' se nenhum dos dois existir
                const safeDeviceId = (evento.deviceId || evento.cameraID || 'unknown-device').toString();
                // 1.4.4.2 Busca a câmera no MongoDB pelo cameraID que veio no evento
                const camera = await prisma.camera.findUnique({
                    where: { // Procura a câmera pelo cameraID quando seu valor for igual ao safeDeviceId
                        cameraID: safeDeviceId 
                        } 
                    });
                // 1.4.4.3 Se não encontrar a câmera, loga e ignora o evento
                if (!camera) {
                    // 1.4.4.4 Se não encontrar a câmera, loga e ignora o evento
                    console.warn(`[Kafka] Evento ignorado: cameraID não cadastrada (${safeDeviceId})`, { 
                        eventId: evento?.eventId, // Pode ser undefined
                        timestamp: evento?.timestamp // Pode ser undefined
                    });
                    return; // Sai do processamento desta mensagem
                }

                // 1.4.5 Validação: precisa ter imagem em base64
                const imageBase64 = evento.image && evento.image.base64;
                if (!imageBase64) {
                    // 1.4.5.1 Se não tiver imagem, loga erro e ignora
                    console.error('Evento recebido sem imageBase64:', evento);
                    return; // Sai do processamento desta mensagem
                }

                // 1.4.6 Converte a imagem base64 para buffer
                const imageBuffer = Buffer.from(imageBase64, 'base64');

                // 1.4.7 Gera o timestamp seguro (usa do evento ou data atual)
                const safeTimestamp = (evento.timestamp || new Date().toISOString()).toString();

                // 1.4.8 Monta a chave do arquivo no MinIO: deviceId/timestamp.jpg
                const key = `${safeDeviceId}/${safeTimestamp}.jpg`;

                // 1.4.9 Envia a imagem para o MinIO
                await s3.send(new PutObjectCommand({
                    Bucket: process.env.MINIO_BUCKET, // 1.4.9.1 Nome do bucket
                    Key: key, // 1.4.9.2 Caminho do arquivo
                    Body: imageBuffer, // 1.4.9.3 Conteúdo
                    ContentType: 'image/jpeg' // 1.4.9.4 Tipo do arquivo
                }));

                // 1.4.10 Monta o objeto do evento para inserir no ClickHouse
                const clickhouseEvent = {
                    eventId: safeTimestamp, // 1.4.10.1 Usa timestamp como ID
                    cameraID: safeDeviceId, // 1.4.10.2 ID da câmera
                    timestamp: toClickhouseDateTime(safeTimestamp), // 1.4.10.3 Timestamp formatado
                    confidence: typeof evento.confidence === 'number' ? evento.confidence : 0, // 1.4.10.4 Confiança
                    image_path: key, // 1.4.10.5 Caminho da imagem
                    payload: JSON.stringify(evento) // 1.4.10.6 Payload original
                };

                // 1.4.11 Query de insert no ClickHouse
                const query = "INSERT INTO events FORMAT JSONEachRow";
                // 1.4.12 Payload no formato JSONEachRow
                const payload = JSON.stringify(clickhouseEvent) + '\n';

                // 1.4.13 Loga detalhes do upload
                console.log('Bucket:', process.env.MINIO_BUCKET, 'Key:', key, 'Buffer size:', imageBuffer.length);

                // 1.4.14 Faz o insert no ClickHouse
                await axios.post(
                    `${process.env.CLICKHOUSE_URL}/?query=${encodeURIComponent(query)}`, // 1.4.14.1 URL do ClickHouse com a query
                    payload, // 1.4.14.2 Payload no formato JSONEachRow
                    {
                        headers: { // 1.4.14.3 Cabeçalhos da requisição
                            'Content-Type': 'application/json'
                        },
                        auth: { // 1.4.14.4 Autenticação
                            username: 'default',
                            password: 'admin'
                        }
                    }
                );
                // 1.4.15 Loga sucesso do insert
                console.log('Insert realizado com sucesso no ClickHouse');

                // 1.4.16 Loga sucesso geral
                console.log('Mensagem processada:', clickhouseEvent.eventId);

            } catch (error) {
                // 1.4.17 Loga erro geral
                console.error('Erro ao processar mensagem:', error);
                // 1.4.18 Se for erro do ClickHouse, loga o detalhe
                if (error.response) {
                    console.error('Erro ClickHouse:', error.response.data);
                }
            }
        }
    });
}

//* Executa a função principal do consumer e captura erros
runConsumer().catch(console.error);


//* 1. Função auxiliar para converter datas para o formato do ClickHouse
function toClickhouseDateTime(input) {
    // 1.1 Tenta converter o input para Date
    try {
        let d;
        // 1.1.1 Se for número, pode ser epoch em ms ou s
        if (typeof input === 'number') {
            d = new Date(input > 1e12 ? input : input * 1000);
        } else if (typeof input === 'string' && /^\d+$/.test(input)) {
            // 1.1.2 Se for string numérica, converte para número
            const n = Number(input);
            d = new Date(n > 1e12 ? n : n * 1000);
        } else if (typeof input === 'string') {
            // 1.1.3 Se for string ISO
            d = new Date(input);
        } else if (input instanceof Date) {
            d = input;
        } else {
            d = new Date();
        }
        // 1.1.4 Se não conseguir converter, usa data atual
        if (isNaN(d.getTime())) d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        // 1.2 Formata para string no padrão ClickHouse
        return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    } catch {
        // 1.3 Em caso de erro, retorna data atual formatada
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    }
}