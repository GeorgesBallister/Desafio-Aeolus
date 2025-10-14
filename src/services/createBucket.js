import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';
import 'dotenv/config';

const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9002',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER || 'minio',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minio123'
  },
  forcePathStyle: true
});

async function createBucketWithRetry(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: process.env.MINIO_BUCKET || 'events' }));
      console.log('Bucket criado com sucesso!');
      return;
    } catch (err) {
      if (err.Code === 'BucketAlreadyOwnedByYou') {
        console.log('Bucket já existe.');
        return;
      }
      console.log(`Tentativa ${i + 1} falhou, tentando novamente em ${delay / 1000}s...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  console.error('Erro ao criar bucket após várias tentativas.');
}

createBucketWithRetry();