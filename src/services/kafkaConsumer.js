//* Dependencias
import { Kafka } from 'kafkajs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

//* Configurações do Kafka
const kafka = new Kafka({
    clientId: 'aeolus-app', // Nome do cliente Kafka
    // Brokers do kafka usando variavel de ambiente
    brokers: [process.env.KAFKA_BROKER] // Endereço do broker Kafka
});

//* Configura o consumidor
const consumer = kafka.consumer({
    groupId: 'aeolus-group' // Grupo do consumidor 1 
}); 

//* Configuração do cliente S3 para MinIO
const s3 = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT, // Endpoint do MinIO
    region: 'us-east-1', // Região do MinIO 
    // Configura as credenciais do MinIO
    credentials:{
        accessKeyId: process.env.MINIO_ACCESS_KEY, // Chave de acesso
        secretAccessKey: process.env.MINIO_SECRET_KEY // Chave secreta
    },
    forcePathStyle: true // Necessário para MinIO
});

//* 1. Função assincrona para executar o consumidor Kafka
async function runConsumer() {
    // 2. Conectamos o consumidor
    await consumer.connect();
    // 3. Inscrevemos o consumidor no tópico 'device-events'
    await consumer.subscribe({
        topic: 'device-events', // 3.1 Nome do tópico
        fromBeginning: false  // 3.2 Ler somente as mensagens novas a partir de agora
    });

    // 4. Rodamos o consumidor para processar mensagens
    await consumer.run({
        // 4.1 Callback para puxarmos cada mensagem recebida
        eachMessage: async ({
            // 4.1.1 Desestruturamos cada mensagem recebida em 3 partes
            topic,  // Nome do tópico
            partition, // Partição do tópico
            message // Mensagem recebida (buffer)
        }) => { // 4.2 Arrow function assincrona para processar cada mensagem 
            try { 
                // 4.2.1 Converte os valores do buffer para string e depois para JSON e armazena na constante evento 
                const evento = JSON.parse(message.value.toString());

                // 4.2.2 Salvar imagem no MinIO convertendo de base64 para buffer
                const imageBuffer = Buffer.from(evento.imageBase64, 'base64');
                // 4.2.3 Define a chave do objeto no MinIO
                const key = `${evento.cameraID}/${evento.eventId}.jpg`;
                // 4.2.4 Comando para enviar o objeto para o MinIO
                await s3.send(new PutObjectCommand({
                    Bucket: process.env.MINIO_BUCKET,  // 4.2.4.1 Nome do bucket (pasta raiz onde o arquivo vai ser salvo)
                    Key: key, // 4.2.4.2 Nome do arquivo (caminho dentro do bucket)
                    Body: imageBuffer, // 4.2.4.3 Conteudo do arquivo
                    ContentType: 'image/jpeg' // 4.2.4.4 Tipo do arquivo
                }));

                // 4.2.5 Salvar metadados no ClickHouse
                const clickhouseEvent = {
                    eventId: evento.eventId, // 4.2.5.1 ID do evento
                    cameraID: evento.cameraID, // 4.2.5.2 ID da câmera
                    timestamp: evento.timestamp, // 4.2.5.3 Timestamp do evento
                    confidence: evento.confidence, // 4.2.5.4 Nível de confiança
                    image_path: key, // 4.2.5.5 Caminho da imagem no MinIO
                    payload: JSON.stringify(evento) // 4.2.5.6 Payload original do evento
                };

                const query = "INSERT INTO events FORMAT JSONEachRow";
                const payload = JSON.stringify(clickhouseEvent) + '\n'; // Garante uma linha por evento

                await axios.post(
                    `${process.env.CLICKHOUSE_URL}/?query=${encodeURIComponent(query)}`,
                    payload,
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );
                // 4.2.7 Joga no console que a mensagem foi processada com sucesso
                console.log('Mensagem processada:', evento.eventId);

            // 4.3 Bloco de tratamento de erro caso algo aconteça durante o processamento da mensagem
            } catch (error) {
                // 4.3.1 Exibe erro no console
                console.error('Erro ao processar mensagem:', error);
            }
        }
    });
}
//* Executa a função do consumidor e captura erros
runConsumer().catch(console.error);