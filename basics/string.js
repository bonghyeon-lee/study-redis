import { createClient } from "redis";

const client = createClient();
await client.connect();

await client.set("username", "test user");
const result = await client.get("username");
console.log("username:", result);

await client.quit();
