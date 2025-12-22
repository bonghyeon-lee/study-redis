import { Injectable, Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../common/redis.provider';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  private uncachedOtpStorage = new Map<string, string>();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async sendOtp(email: string): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `otp:${email}`;

    // SETEX: Set value with TTL (3 minutes = 180 seconds)
    await this.redis.setex(key, 180, otp);

    return otp; // In real world, send via email. Here we return for testing.
  }

  async verifyOtp(email: string, code: string): Promise<boolean> {
    const key = `otp:${email}`;
    const storedOtp = await this.redis.get(key);

    if (storedOtp === code) {
      await this.redis.del(key);
      return true;
    }

    return false;
  }

  async sendOtpUncached(email: string): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Simulate DB Latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    this.uncachedOtpStorage.set(email, otp);

    // Auto-delete after 3 mins (simplified for uncached demo)
    setTimeout(() => this.uncachedOtpStorage.delete(email), 180000);

    return otp;
  }

  async verifyOtpUncached(email: string, code: string): Promise<boolean> {
    // Simulate DB Latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    const storedOtp = this.uncachedOtpStorage.get(email);

    if (storedOtp === code) {
      this.uncachedOtpStorage.delete(email);
      return true;
    }

    return false;
  }
}
