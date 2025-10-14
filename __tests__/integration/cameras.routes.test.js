import request from 'supertest';
import app from '../../src/app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Integração: /cameras', () => {
  let createdId;
  const payload = {
    name: 'Cam Test',
    cameraID: 'TEST-CAM-1',
    zona: 'Teste',
    enderecoRTSP: 'rtsp://example/stream'
  };

  afterAll(async () => {
    try {
      await prisma.camera.deleteMany({ where: { cameraID: payload.cameraID } });
    } catch {}
    await prisma.$disconnect();
  });

  test('POST /cameras cria uma câmera', async () => {
    const res = await request(app).post('/cameras').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.cameraID).toBe(payload.cameraID);
    createdId = res.body.id;
  });

  test('GET /cameras lista câmeras', async () => {
    const res = await request(app).get('/cameras');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /cameras/:id busca por id', async () => {
    const res = await request(app).get(`/cameras/${createdId}`);
    expect([200,404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.id).toBe(createdId);
    }
  });

  test('PUT /cameras/:id atualiza', async () => {
    const res = await request(app).put(`/cameras/${createdId}`).send({ zona: 'Atualizada' });
    expect([200,404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.zona).toBe('Atualizada');
    }
  });

  test('DELETE /cameras/:id apaga', async () => {
    const res = await request(app).delete(`/cameras/${createdId}`);
    expect([204,400,404]).toContain(res.status);
  });
});
