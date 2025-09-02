import { Queue } from "bullmq";
import type IORedis from "ioredis";
import { getRedis } from "../redis/index.js";

let connection: IORedis | null = null;
let defaultQueue: Queue | null = null;

export function initQueues() {
  const conn = getRedis();
  if (!conn) return;
  if (!connection) {
    connection = conn;
    defaultQueue = new Queue("default", { connection });
  }
}

export function getDefaultQueue(): Queue | null {
  return defaultQueue;
}

export async function closeQueues() {
  if (defaultQueue) {
    await defaultQueue.close();
    defaultQueue = null;
  }
}
