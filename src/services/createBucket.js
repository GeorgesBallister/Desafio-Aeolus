// * Imports
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';
import 'dotenv/config';

//* Configuração do cliente S3 para MinIO
const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9002',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER || 'minio',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minio123'
  },
  forcePathStyle: true // Necessário para MinIO
});

//* 1. Função para criar o bucket se não existir, com tentativas pra evitar falhas de conexão
async function createBucketWithRetry(retries = 10, delay = 3000) {
  // 2. Tenta criar o bucket com um loop de tentativas
  for (let i = 0; i < retries; i++) {
    // 3. Tenta criar o bucket
    try {
      // 3.1 Comando para criar o bucket
      await s3.send(new CreateBucketCommand({
        Bucket: process.env.MINIO_BUCKET || 'events' // Nome do bucket (padrão 'events')
      }));
      // 3.2 Se conseguir, loga o sucesso e sai da função
      console.log('Bucket criado com sucesso!');
      // 3.3 Sai da função
      return;
      // 4. Se falhar, captura o erro
    } catch (err) {
      // 4.1 Se o erro for que o bucket já existe, apenas loga e sai
      if (err.Code === 'BucketAlreadyOwnedByYou') {
        console.log('Bucket já existe.');
        return;
      }
      // 4.2 Loga o erro e espera um pouco antes de tentar novamente
      console.log(`Tentativa ${i + 1} falhou, tentando novamente em ${delay / 1000}s...`);
      // 4.3 Espera o delay antes de tentar novamente
      await new Promise(res => setTimeout(res, delay));
    }
  }
  // 5. Se todas as tentativas falharem, loga o erro final
  console.error('Erro ao criar bucket após várias tentativas.');
}

//* Executa a função para criar o bucket assim que o script é rodado
createBucketWithRetry();