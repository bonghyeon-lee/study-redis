import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { REDIS_CLIENT } from '../common/redis.provider';
import RedisMock from 'ioredis-mock';
import { describe, it, expect, beforeEach } from 'vitest';
import Redis from 'ioredis';

describe('AuthService', () => {
  let service: AuthService;
  let redis: Redis;

  beforeEach(async () => {
    // ioredis-mock returns a Redis-compatible instance
    redis = new RedisMock() as unknown as Redis;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: REDIS_CLIENT,
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should generate and store OTP with TTL', async () => {
    const email = 'test@example.com';
    const otp = await service.sendOtp(email);

    expect(otp).toHaveLength(6);
    const stored = await redis.get(`otp:${email}`);
    expect(stored).toBe(otp);

    // Verify TTL (ioredis-mock supports ttl)
    const ttl = await redis.ttl(`otp:${email}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(180);
  });

  it('should verify OTP correctly and delete it', async () => {
    const email = 'test@example.com';
    const otp = '123456';
    await redis.set(`otp:${email}`, otp);

    const isValid = await service.verifyOtp(email, otp);
    expect(isValid).toBe(true);

    const stored = await redis.get(`otp:${email}`);
    expect(stored).toBeNull();
  });

  it('should return false for invalid OTP', async () => {
    const email = 'test@example.com';
    await redis.set(`otp:${email}`, '111111');

    const isValid = await service.verifyOtp(email, '222222');
    expect(isValid).toBe(false);
  });
});
