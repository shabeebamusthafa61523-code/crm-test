import Redis from 'ioredis';

const redisOptions = {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    // Stop reconnecting after 2 attempts to keep the console clean if Redis is offline
    if (times > 2) {
      return null; 
    }
    return 1000;
  }
};

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', redisOptions);

redis.on('connect', () => {
  console.log('Successfully connected to Redis.');
});

redis.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    if (!global.redisErrorLogged) {
      console.warn('⚠️ Local Redis is offline. Skipping Redis-dependent features (caching, inactivity timeouts).');
      global.redisErrorLogged = true;
    }
  } else {
    console.error('Redis Connection Error:', err);
  }
});

export default redis;
