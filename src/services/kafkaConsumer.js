//* Dependencias
import { Kafka } from 'kafkajs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

//* Configurações do Kafka
const kafka = new Kafka({
    clientId: 'aeolus-app',
    // Brokers do kafka usando variavel de ambiente
    brokers: [process.env.KAFKA_BROKER] // Endereço do broker Kafka
    
});

const consumer = kafka.consumer({ groupId: 'aeolus-group' }); // Grupo do consumidor

await consumer.connect();
await consumer.subscribe({ 
    topic: 'device-events', 
    fromBeginning: false 
    }); // Inscreve no tópico device-events

async function runConsumer() {
    await consumer.connect();
    await consumer.subscribe({
        topic: 'device-events',
        fromBeginning: false 
    });
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const evento = JSON.parse(message.value.toString());
            console.log('Mensagem recebida:', evento);
        }
    });
}

// Salvar a imagem no MinIO
const s3 = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,
    region: 'us-east-1',
    credentials:{
        accessKeyId: process.env.MINIO_ACCESS_KEY,
        secretAccessKey: process.env.MINIO_SECRET_KEY
    },
    forcePathStyle: true // Necessário para MinIO
});
 
const imageBuffer = Buffer.from(evento.imageBase64, 'base64');
const key = `${evento.cameraID}/${evento.eventId}.jpg`;

await s3.send(new PutObjectCommand({
    Bucket: process.env.MINIO_BUCKET,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/jpeg'
}));
// Salvar o evento no ClickHouse
const clickhouseEvent = {
    eventId: evento.eventId,
    cameraID: evento.cameraID,
    timestamp: evento.timestamp,
    confidence: evento.confidence,
    image_path: key,
    payload: JSON.stringify(evento)
};

// Envia o evento para o ClickHouse
await axios.post(
    `${process.env.CLICKHOUSE_URL}/?query=INSERT%20INTO%20events%20FORMAT%20JSONEachRow`,
    JSON.stringify(clickhouseEvent),
    { headers: { 'Content-Type': 'application/json' } }
);

// Inicia o consumidor Kafka
await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
        try {
            const evento = JSON.parse(message.value.toString());

        // Salvar a imagem no MinIO
        // salvar metadados no ClickHouse
        console.log('Mensagem processada:', evento);
        
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);    
        }
    }
});


runConsumer().catch(console.error);