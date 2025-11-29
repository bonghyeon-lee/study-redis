import client from "./redisClient.js";

/**
 * Session store using Redis Hash + TTL
 */
export async function createSession(sessionId, data = {}, ttlSeconds = 3600) {
  if (Object.keys(data).length > 0) {
    await client.hSet(sessionId, data);
  } else {
    await client.hSet(sessionId, {});
  }
  if (ttlSeconds > 0) await client.expire(sessionId, ttlSeconds);
}

export async function getSession(sessionId) {
  const data = await client.hGetAll(sessionId);
  if (Object.keys(data).length === 0) return null;
  return data;
}

export async function destroySession(sessionId) {
  await client.del(sessionId);
}
