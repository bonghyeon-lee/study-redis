import { Test, TestingModule } from '@nestjs/testing';
import { CouponService } from './coupon.service';
import { REDIS_CLIENT } from '../common/redis.provider';
import RedisMock from 'ioredis-mock';
import { describe, it, expect, beforeEach } from 'vitest';
import Redis from 'ioredis';

describe('CouponService', () => {
  let service: CouponService;
  let redis: Redis;

  beforeEach(async () => {
    redis = new RedisMock() as unknown as Redis;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        {
          provide: REDIS_CLIENT,
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
    await redis.flushall();
    // Manually trigger onModuleInit since NestJS won't do it automatically in unit tests
    service.onModuleInit();
  });

  it('should issue coupon and block double claim', async () => {
    // First claim
    const res1 = await service.issueCoupon('user1');
    expect(res1.success).toBe(true);
    expect(res1.message).toBe('SUCCESS');

    // Second claim
    const res2 = await service.issueCoupon('user1');
    expect(res2.success).toBe(false);
    expect(res2.message).toBe('ALREADY_CLAIMED');

    const stats = await service.getStats();
    expect(stats.count).toBe(1);
  });

  it('should block claim when limit exceeded', async () => {
    // Fill up to limit (100)
    // For performance in tests, we can manually set the value or use a loop
    // Let's just mock the key value to test the logic
    await redis.set('coupon:count', '100');

    const res = await service.issueCoupon('new_user');
    expect(res.success).toBe(false);
    expect(res.message).toBe('LIMIT_EXCEEDED');
  });
});
