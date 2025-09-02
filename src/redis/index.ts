import IORedis from "ioredis";
import { env } from "../config/index.js";

let client: IORedis | null = null;

export function getRedis(): IORedis | null {
  if (!env.REDIS_URL) return null;
  if (!client) {
    client = new IORedis(env.REDIS_URL);
  }
  return client;
}

export function closeRedis() {
  if (client) {
    client.disconnect();
    client = null;
  }
}
