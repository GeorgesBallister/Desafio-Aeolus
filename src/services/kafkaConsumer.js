//* Dependencias
import { Kafka } from 'kafkajs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

//* Configurações do Kafka
const kafka = new Kafka({
    clientId: 'aeolus-app',
    brokers: [process.env.KAFKA_BROKER] // Endereço do broker Kafka
    
});