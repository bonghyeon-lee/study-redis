import { createClient } from "redis";

const client = createClient();
await client.connect();

const pong = await client.ping();
console.log("PING:", pong);

await client.quit();
