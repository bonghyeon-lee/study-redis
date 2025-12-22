import { Test, TestingModule } from '@nestjs/testing';
import { RankingService } from './ranking.service';
import { REDIS_CLIENT } from '../common/redis.provider';
import RedisMock from 'ioredis-mock';
import { describe, it, expect, beforeEach } from 'vitest';
import Redis from 'ioredis';

describe('RankingService', () => {
  let service: RankingService;
  let redis: Redis;

  beforeEach(async () => {
    redis = new RedisMock() as unknown as Redis;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingService,
        {
          provide: REDIS_CLIENT,
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get<RankingService>(RankingService);
    await redis.flushall();
  });

  it('should update score and maintain rank', async () => {
    await service.addScore('u1', 100);
    await service.addScore('u2', 200);
    await service.addScore('u3', 150);

    const top = await service.getTopRankers(3);
    expect(top[0].userId).toBe('u2');
    expect(top[0].score).toBe(200);
    expect(top[1].userId).toBe('u3');
    expect(top[2].userId).toBe('u1');
  });

  it('should retrieve individual user rank', async () => {
    await service.addScore('user1', 50);
    await service.addScore('user2', 150);

    const rankData = await service.getUserRank('user1');
    expect(rankData!.rank).toBe(2);
    expect(rankData!.score).toBe(50);
  });

  it('should return null for non-existent user', async () => {
    const rankData = await service.getUserRank('none');
    expect(rankData).toBeNull();
  });
});
