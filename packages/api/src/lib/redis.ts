import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export const redis = globalForRedis.redis || new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    if (times > 10) return null;
    return Math.min(times * 200, 2000);
  },
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
