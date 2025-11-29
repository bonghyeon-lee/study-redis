import client from "./redisClient.js";

/**
 * Simple cache utility: JSON serialize + optional TTL (seconds)
 */
export async function setCache(key, value, ttlSeconds = 60) {
  const str = JSON.stringify(value);
  if (ttlSeconds > 0) {
    await client.set(key, str, { EX: ttlSeconds });
  } else {
    await client.set(key, str);
  }
}

export async function getCache(key) {
  const raw = await client.get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function delCache(key) {
  await client.del(key);
}
