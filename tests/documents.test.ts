import 'reflect-metadata';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { AppModule } from '../src/app.module';

describe('문서 API', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  test('헬스 체크가 정상 상태를 반환한다', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('새 문서를 저장하고 단건 조회할 수 있다', async () => {
    const putResponse = await request(app.getHttpServer())
      .put('/api/v1/documents/document-1')
      .send({
        title: '첫 문서',
        content: 'hello',
        metadata: { source: 'test' },
      });

    expect(putResponse.status).toBe(200);
    expect(putResponse.body).toMatchObject({
      id: 'document-1',
      title: '첫 문서',
      content: 'hello',
      metadata: { source: 'test' },
    });

    const getResponse = await request(app.getHttpServer()).get('/api/v1/documents/document-1');

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      id: 'document-1',
      title: '첫 문서',
      content: 'hello',
      metadata: { source: 'test' },
    });
  });

  test('문서 목록은 생성일 역순으로 반환된다', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/documents/older')
      .send({ title: '오래된 문서', content: 'old', metadata: {} });
    await request(app.getHttpServer())
      .put('/api/v1/documents/newer')
      .send({ title: '새 문서', content: 'new', metadata: {} });

    const response = await request(app.getHttpServer()).get('/api/v1/documents');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      items: [
        { id: 'newer', title: '새 문서' },
        { id: 'older', title: '오래된 문서' },
      ],
    });
  });

  test('존재하지 않는 문서를 조회하면 404를 반환한다', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/documents/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'DOCUMENT_NOT_FOUND',
        message: '문서를 찾을 수 없습니다.',
      },
    });
  });

  test('잘못된 입력값이면 400을 반환한다', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/v1/documents/document-1')
      .send({
        title: '',
        content: 'hello',
        metadata: {},
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
      },
    });
  });

  test('문서를 삭제하면 이후 조회할 수 없다', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/documents/document-1')
      .send({ title: '삭제할 문서', content: 'bye', metadata: {} });

    const deleteResponse = await request(app.getHttpServer()).delete('/api/v1/documents/document-1');

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app.getHttpServer()).get('/api/v1/documents/document-1');

    expect(getResponse.status).toBe(404);
  });
});

