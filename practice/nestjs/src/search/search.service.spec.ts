import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { REDIS_CLIENT } from '../common/redis.provider';
import RedisMock from 'ioredis-mock';
import { describe, it, expect, beforeEach } from 'vitest';
import Redis from 'ioredis';

describe('SearchService', () => {
  let service: SearchService;
  let redis: Redis;

  beforeEach(async () => {
    redis = new RedisMock() as unknown as Redis;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: REDIS_CLIENT,
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should add keywords and maintain only 5 items', async () => {
    const userId = 'user1';

    await service.addKeyword(userId, 'k1');
    await service.addKeyword(userId, 'k2');
    await service.addKeyword(userId, 'k3');
    await service.addKeyword(userId, 'k4');
    await service.addKeyword(userId, 'k5');
    await service.addKeyword(userId, 'k6'); // Should push k1 out

    const history = await service.getHistory(userId);
    expect(history).toHaveLength(5);
    expect(history[0]).toBe('k6'); // Most recent
    expect(history[4]).toBe('k2'); // 5th item
    expect(history).not.toContain('k1');
  });

  it('should return empty list if no history', async () => {
    const history = await service.getHistory('none');
    expect(history).toEqual([]);
  });
});
