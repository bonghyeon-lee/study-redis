import client from "./redisClient.js";
import { setCache, getCache } from "./cache.js";
import { createSession, getSession, destroySession } from "./session.js";
import { updateScore, getTopN, getRank } from "./ranking.js";
import { enqueue, dequeue } from "./queue.js";

async function run() {
  console.log("== CACHE example ==");
  await setCache("user:1", { id: 1, name: "alice" }, 30);
  console.log("cached user:", await getCache("user:1"));

  console.log("\n== SESSION example ==");
  await createSession("sess:abcd", { userId: "1", role: "admin" }, 120);
  console.log("session:", await getSession("sess:abcd"));
  await destroySession("sess:abcd");
  console.log("session after destroy:", await getSession("sess:abcd"));

  console.log("\n== RANKING example ==");
  await updateScore("rank:game", "alice", 1200);
  await updateScore("rank:game", "bob", 1500);
  await updateScore("rank:game", "carol", 1100);
  console.log("top 3:", await getTopN("rank:game", 3));
  console.log("bob rank:", await getRank("rank:game", "bob"));

  console.log("\n== QUEUE example ==");
  await enqueue("queue:jobs", { id: "job1", payload: "do-something" });
  await enqueue("queue:jobs", { id: "job2", payload: "do-other" });
  console.log("dequeued:", await dequeue("queue:jobs"));
  console.log("dequeued:", await dequeue("queue:jobs"));

  await client.quit();
}

await run();
