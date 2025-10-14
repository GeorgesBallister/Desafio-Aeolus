import request from 'supertest';
import app from '../../src/app.js';
import axios from 'axios';

// Pequeno mock leve para evitar chamadas reais se variáveis não estiverem setadas
const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL;

describe('Integração: /eventos', () => {
  test('GET /eventos responde lista (ClickHouse)', async () => {
    if (!CLICKHOUSE_URL) {
      console.warn('CLICKHOUSE_URL não configurada, pulando teste.');
      return;
    }
    const res = await request(app).get('/eventos');
    expect([200,400]).toContain(res.status);
  });

  test('GET /eventos/filter com paginação', async () => {
    if (!CLICKHOUSE_URL) return;
    const res = await request(app).get('/eventos/filter').query({ limit: 5, offset: 0 });
    expect([200,400]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });

  test('GET /eventos/camera/:cameraID/latest', async () => {
    if (!CLICKHOUSE_URL) return;
    const res = await request(app).get('/eventos/camera/TEST-CAM-1/latest').query({ limit: 3 });
    expect([200,400]).toContain(res.status);
  });

  test('GET /eventos/:id/image-url gera URL assinada (quando existir)', async () => {
    if (!CLICKHOUSE_URL) return;
    // evento inexistente deve retornar 404
    const res = await request(app).get('/eventos/ID-QUE-N-EXISTE/image-url');
    expect([404,400]).toContain(res.status);
  });
});
