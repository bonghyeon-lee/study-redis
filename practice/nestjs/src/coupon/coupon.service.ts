import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { REDIS_CLIENT } from '../common/redis.provider';
import Redis from 'ioredis';

@Injectable()
export class CouponService implements OnModuleInit {
  private readonly COUPON_COUNT_KEY = 'coupon:count';
  private readonly COUPON_USERS_KEY = 'coupon:users';
  private readonly COUPON_LIMIT = 100;

  // Uncached simulation
  private uncachedCouponCount = 0;
  private uncachedCouponUsers = new Set<string>();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) { }

  onModuleInit() {
    // Define Lua script for atomic coupon issuance
    // Parameters: KEYS[1] (count key), KEYS[2] (users set key), ARGV[1] (userId), ARGV[2] (limit)
    this.redis.defineCommand('issueCouponSafe', {
      numberOfKeys: 2,
      lua: `
        local count = tonumber(redis.call('get', KEYS[1]) or '0')
        local limit = tonumber(ARGV[2])
        local userId = ARGV[1]
        
        -- 1. Check if limit exceeded
        if count >= limit then
          return {0, 'LIMIT_EXCEEDED'}
        end
        
        -- 2. Check if user already claimed
        if redis.call('sismember', KEYS[2], userId) == 1 then
          return {0, 'ALREADY_CLAIMED'}
        end
        
        -- 3. Issue coupon
        redis.call('incr', KEYS[1])
        redis.call('sadd', KEYS[2], userId)
        
        return {1, 'SUCCESS'}
      `,
    });
  }

  async issueCoupon(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const [success, message] = await (this.redis as any).issueCouponSafe(
      this.COUPON_COUNT_KEY,
      this.COUPON_USERS_KEY,
      userId,
      this.COUPON_LIMIT,
    );

    return { success: success === 1, message };
  }

  async getStats(): Promise<{ count: number; limit: number }> {
    const count = await this.redis.get(this.COUPON_COUNT_KEY);
    return {
      count: parseInt(count || '0', 10),
      limit: this.COUPON_LIMIT,
    };
  }

  // --- Uncached Implementation (With Intentional Race Condition) ---

  async issueCouponUncached(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Simulate DB Latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Intentional Race Condition: Read-Modify-Write without locking
    if (this.uncachedCouponCount >= this.COUPON_LIMIT) {
      return { success: false, message: 'LIMIT_EXCEEDED' };
    }

    if (this.uncachedCouponUsers.has(userId)) {
      return { success: false, message: 'ALREADY_CLAIMED' };
    }

    // Still simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 10));

    this.uncachedCouponCount++;
    this.uncachedCouponUsers.add(userId);

    return { success: true, message: 'SUCCESS' };
  }

  getStatsUncached(): { count: number; limit: number } {
    return {
      count: this.uncachedCouponCount,
      limit: this.COUPON_LIMIT,
    };
  }
}
