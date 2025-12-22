import { Injectable, Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../common/redis.provider';
import Redis from 'ioredis';

@Injectable()
export class SearchService {
  private uncachedSearchStorage = new Map<string, string[]>();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async addKeyword(userId: string, keyword: string): Promise<void> {
    const key = `search:history:${userId}`;

    // Pipeline: Group multiple commands into one RTT
    await this.redis
      .pipeline()
      .lpush(key, keyword) // Add to front
      .ltrim(key, 0, 4) // Keep only top 5 (0~4)
      .exec();
  }

  async getHistory(userId: string): Promise<string[]> {
    const key = `search:history:${userId}`;
    return this.redis.lrange(key, 0, 4);
  }

  async clearHistory(userId: string): Promise<void> {
    const key = `search:history:${userId}`;
    await this.redis.del(key);
  }

  async addKeywordUncached(userId: string, keyword: string): Promise<void> {
    // Simulate DB Latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    const history = this.uncachedSearchStorage.get(userId) || [];
    const newHistory = [keyword, ...history].slice(0, 5);
    this.uncachedSearchStorage.set(userId, newHistory);
  }

  async getHistoryUncached(userId: string): Promise<string[]> {
    // Simulate DB Latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    return this.uncachedSearchStorage.get(userId) || [];
  }
}
