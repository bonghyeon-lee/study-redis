import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { NoticesService } from './../src/notices/notices.service';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import Redis from 'ioredis';

describe('NoticesController (E2E)', () => {
  let app: INestApplication;
  let noticesService: NoticesService;
  let redisClient: Redis;

  beforeEach(async () => {
    // Connect to Redis for independent verification
    redisClient = new Redis({ host: 'localhost', port: 6379 });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    noticesService = moduleFixture.get(NoticesService);

    // Clear cache before each test
    await redisClient.del('/notices');
  });

  afterAll(async () => {
    await app.close();
    await redisClient.quit();
  });

  it('should return cached data on second request (Latency check)', async () => {
    // 1. First Request (Uncached)
    const start1 = Date.now();
    await request(app.getHttpServer()).get('/notices').expect(200);
    const duration1 = Date.now() - start1;

    // 2. Second Request (Cached)
    const start2 = Date.now();
    await request(app.getHttpServer()).get('/notices').expect(200);
    const duration2 = Date.now() - start2;

    console.log(`Duration 1 (Uncached): ${duration1}ms`);
    console.log(`Duration 2 (Cached): ${duration2}ms`);

    expect(duration2).toBeLessThan(duration1);
  });

  it('should invalidate cache after POST /notices', async () => {
    const findAllSpy = vi.spyOn(noticesService, 'findAll');

    // 1. GET (Cache Miss)
    await request(app.getHttpServer()).get('/notices').expect(200);
    expect(findAllSpy).toHaveBeenCalledTimes(1);

    // 2. GET (Cache Hit)
    await request(app.getHttpServer()).get('/notices').expect(200);
    expect(findAllSpy).toHaveBeenCalledTimes(1);

    // 3. POST (Invalidate)
    await request(app.getHttpServer())
      .post('/notices')
      .send({ title: 'New', content: 'Notice' })
      .expect(201);

    // 4. GET (Cache Miss)
    await request(app.getHttpServer()).get('/notices').expect(200);
    expect(findAllSpy).toHaveBeenCalledTimes(2);
  });

  it('should expire cache after 5 minutes (TTL Check)', async () => {
    // 1. Trigger Cache
    await request(app.getHttpServer()).get('/notices').expect(200);

    // 2. Check TTL using independent Redis client
    const keys = await redisClient.keys('*');
    console.log(`Current Redis Keys: ${JSON.stringify(keys)}`);

    const ttl = await redisClient.ttl('/notices');
    console.log(`TTL for /notices: ${ttl}`);

    // 300 seconds = 300. It might be 299 or 300 depending on timing
    expect(ttl).toBeGreaterThan(290);
    expect(ttl).toBeLessThanOrEqual(300);
  });
});
