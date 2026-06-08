import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    // Exponential backoff up to 30 seconds to prevent aggressive connection spamming
    return Math.min(times * 2000, 30000);
  }
});

redis.on('connect', () => {
  console.log('Successfully connected to Redis.');
});

let connectionFailedLogged = false;
redis.on('error', (err) => {
  if (!connectionFailedLogged) {
    console.warn('⚠️ Local Redis is not running. Session inactivity features will be bypassed.');
    connectionFailedLogged = true;
  }
});

export default redis;
