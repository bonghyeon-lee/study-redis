import client from "./redisClient.js";

/**
 * Simple queue (LPUSH + BRPOP) helpers
 */
export async function enqueue(queueName, payload) {
  const str = typeof payload === "string" ? payload : JSON.stringify(payload);
  await client.lPush(queueName, str);
}

export async function dequeue(queueName, timeoutSeconds = 1) {
  // brPop returns null if timeout
  const res = await client.brPop(queueName, timeoutSeconds);
  if (!res) return null;
  const elem = res.element;
  try {
    return JSON.parse(elem);
  } catch {
    return elem;
  }
}
