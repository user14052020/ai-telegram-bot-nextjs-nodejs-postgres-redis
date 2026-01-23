import { createClient } from 'redis';
import { config } from '@/config.js';

const primaryRedisUrl = config.redisUrl ?? `redis://${config.redis.host}:${config.redis.port}`;
const fallbackRedisUrl = process.env.REDIS_FALLBACK_URL ?? 'redis://host.docker.internal:6379';

type RedisClient = ReturnType<typeof createClient>;

const transientCodes = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED']);
let isConnecting = false;

const buildClient = (url: string): RedisClient => {
  const client = createClient({
    url,
    socket: {
      connectTimeout: 2000,
      reconnectStrategy: () => false
    }
  });
  client.on('error', (err) => {
    if (!redisEnabled) return;
    const code = (err as NodeJS.ErrnoException)?.code;
    if (isConnecting && code && transientCodes.has(code)) return;
    console.error('Redis error', err);
  });
  return client;
};

export let redisClient = buildClient(primaryRedisUrl);
let redisEnabled = true;

const disableRedis = (error?: unknown) => {
  if (!redisEnabled) return;
  redisEnabled = false;
  if (error) {
    console.warn('Redis disabled, continuing without cache.', error);
  } else {
    console.warn('Redis disabled, continuing without cache.');
  }
  if (redisClient.isOpen) {
    try {
      redisClient.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
  }
};

export const connectRedis = async (): Promise<void> => {
  if (!redisEnabled || redisClient.isOpen) return;

  isConnecting = true;

  const tryConnect = async (url: string, attempts: number): Promise<void> => {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await redisClient.connect();
        return;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException)?.code;
        if (!code || !transientCodes.has(code) || attempt === attempts) {
          throw error;
        }
        if (redisClient.isOpen) {
          try {
            redisClient.disconnect();
          } catch {
            // Ignore disconnect failures.
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  };

  try {
    await tryConnect(primaryRedisUrl, 3);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === 'ENOTFOUND' && fallbackRedisUrl && fallbackRedisUrl !== primaryRedisUrl) {
      console.warn(`Redis host not found (${primaryRedisUrl}). Trying fallback ${fallbackRedisUrl}.`);
      redisClient = buildClient(fallbackRedisUrl);
      try {
        await tryConnect(fallbackRedisUrl, 2);
        return;
      } catch (fallbackError) {
        disableRedis(fallbackError);
        return;
      }
    }
    disableRedis(error);
  } finally {
    isConnecting = false;
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!redisEnabled || !redisClient.isOpen) return null;
  try {
    const value = await redisClient.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    disableRedis(error);
    return null;
  }
};

export const setCache = async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
  if (!redisEnabled || !redisClient.isOpen) return;
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    disableRedis(error);
  }
};
