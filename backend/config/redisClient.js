// config/redisClient.js
const { createClient } = require('redis');

const REDIS_RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRIES = 5;

let retryCount = 0;
let redisClient = null;

function createRedisClient() {
  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'redis', // Use service name from docker-compose
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
      reconnectStrategy: (retries) => {
        if (retries > MAX_RETRIES) {
          console.error(`❌ Redis max retries (${MAX_RETRIES}) reached`);
          return new Error('Max retries reached');
        }
        return REDIS_RETRY_DELAY;
      }
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('✅ Connected to Redis');
    retryCount = 0; // Reset retry count on successful connection
  });

  client.on('reconnecting', () => {
    console.log(`🔄 Reconnecting to Redis... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
    retryCount++;
  });

  return client;
}

// Khởi tạo Redis client và xử lý kết nối
async function initRedisClient() {
  try {
    if (!redisClient) {
      redisClient = createRedisClient();
    }

    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    // Thêm các phương thức wrapper để xử lý lỗi
    const originalSet = redisClient.set.bind(redisClient);
    redisClient.set = async (...args) => {
      try {
        return await originalSet(...args);
      } catch (err) {
        console.error('Redis SET error:', err);
        return null;
      }
    };

    const originalGet = redisClient.get.bind(redisClient);
    redisClient.get = async (...args) => {
      try {
        return await originalGet(...args);
      } catch (err) {
        console.error('Redis GET error:', err);
        return null;
      }
    };

    // Thêm phương thức setex an toàn
    redisClient.setex = async (key, seconds, value) => {
      try {
        return await redisClient.set(key, value, {
          EX: seconds
        });
      } catch (err) {
        console.error('Redis SETEX error:', err);
        return null;
      }
    };

    return redisClient;
  } catch (err) {
    console.error('❌ Redis initialization failed:', err);
    return null;
  }
}

// Khởi tạo kết nối Redis
initRedisClient().catch(console.error);

module.exports = redisClient;
