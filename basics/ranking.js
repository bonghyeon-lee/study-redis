import client from "./redisClient.js";

/**
 * Ranking helpers using Sorted Sets
 */
export async function updateScore(key, member, score) {
  await client.zAdd(key, { score, value: member });
}

export async function getTopN(key, n = 10) {
  // Return top n members with scores (highest first)
  // Use zRangeWithScores with REV option (some redis clients expose zRangeWithScores)
  const items = await client.zRangeWithScores(key, 0, n - 1, { REV: true });
  return items; // [{ value, score }, ...]
}

export async function getRank(key, member) {
  // Not all client typings include zRevRank; compute descending rank via zRank + zCard
  const ascRank = await client.zRank(key, member);
  if (ascRank === null) return null;
  const total = await client.zCard(key);
  return total - ascRank; // 1-based descending rank
}
