import { logger } from "./logger";

const REDIS_URL = process.env.REDIS_URL;

let redisClient: any = null;

if (REDIS_URL) {
  try {
    // Dynamic import to avoid crash if ioredis is not installed in development
    const { default: Redis } = require("ioredis");
    redisClient = new Redis(REDIS_URL);
    logger.info("Connected to Redis server successfully.");
  } catch (err: any) {
    logger.warn(`Redis URL is set but ioredis could not be loaded (${err.message}). Falling back to in-memory store.`);
  }
}

// In-memory fallback stores
const memoryStore = new Map<string, string>();
const memoryExpirations = new Map<string, number>();

export const redis = {
  async get(key: string): Promise<string | null> {
    if (redisClient) {
      return await redisClient.get(key);
    }
    const expireAt = memoryExpirations.get(key);
    if (expireAt && Date.now() > expireAt) {
      memoryStore.delete(key);
      memoryExpirations.delete(key);
      return null;
    }
    return memoryStore.get(key) || null;
  },

  async set(key: string, value: string, mode?: string, duration?: number): Promise<void> {
    if (redisClient) {
      if (mode === "EX" && duration) {
        await redisClient.set(key, value, "EX", duration);
      } else if (mode === "PX" && duration) {
        await redisClient.set(key, value, "PX", duration);
      } else {
        await redisClient.set(key, value);
      }
      return;
    }
    memoryStore.set(key, value);
    if (mode === "EX" && duration) {
      memoryExpirations.set(key, Date.now() + duration * 1000);
    } else if (mode === "PX" && duration) {
      memoryExpirations.set(key, Date.now() + duration);
    }
  },

  async del(key: string): Promise<void> {
    if (redisClient) {
      await redisClient.del(key);
      return;
    }
    memoryStore.delete(key);
    memoryExpirations.delete(key);
  },

  async setnx(key: string, value: string): Promise<number> {
    if (redisClient) {
      return await redisClient.setnx(key, value);
    }
    if (memoryStore.has(key)) {
      const expireAt = memoryExpirations.get(key);
      if (!expireAt || Date.now() <= expireAt) {
        return 0; // Already exists
      }
    }
    memoryStore.set(key, value);
    return 1;
  },

  async incr(key: string): Promise<number> {
    if (redisClient) {
      return await redisClient.incr(key);
    }
    const val = parseInt(memoryStore.get(key) || "0", 10) + 1;
    memoryStore.set(key, String(val));
    return val;
  },

  async expire(key: string, seconds: number): Promise<void> {
    if (redisClient) {
      await redisClient.expire(key, seconds);
      return;
    }
    memoryExpirations.set(key, Date.now() + seconds * 1000);
  }
};
