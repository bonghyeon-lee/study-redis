import { Injectable, Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../common/redis.provider';
import Redis from 'ioredis';

@Injectable()
export class RankingService {
  private readonly RANKING_KEY = 'ranking:leaderboard';
  private uncachedRanking = new Map<string, number>();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // --- Redis Implementation ---

  async addScore(userId: string, score: number): Promise<number> {
    const newScore = await this.redis.zincrby(this.RANKING_KEY, score, userId);
    return parseFloat(newScore);
  }

  async getTopRankers(
    limit: number = 10,
  ): Promise<{ userId: string; score: number }[]> {
    const results = await this.redis.zrevrange(
      this.RANKING_KEY,
      0,
      limit - 1,
      'WITHSCORES',
    );
    const rankers: { userId: string; score: number }[] = [];
    for (let i = 0; i < results.length; i += 2) {
      rankers.push({
        userId: results[i],
        score: parseFloat(results[i + 1]),
      });
    }
    return rankers;
  }

  async getUserRank(
    userId: string,
  ): Promise<{ rank: number; score: number } | null> {
    const [rank, score] = await Promise.all([
      this.redis.zrevrank(this.RANKING_KEY, userId),
      this.redis.zscore(this.RANKING_KEY, userId),
    ]);

    if (score === null) return null;

    return {
      rank: rank !== null ? rank + 1 : -1,
      score: parseFloat(score),
    };
  }

  // --- Uncached Implementation (Simulated DB) ---

  async addScoreUncached(userId: string, score: number): Promise<number> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const currentScore = this.uncachedRanking.get(userId) || 0;
    const newScore = currentScore + score;
    this.uncachedRanking.set(userId, newScore);
    return newScore;
  }

  async getTopRankersUncached(
    limit: number = 10,
  ): Promise<{ userId: string; score: number }[]> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return Array.from(this.uncachedRanking.entries())
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
