import IORedis from 'ioredis';

const url = process.env['UPSTASH_REDIS_URL'];
if (!url) {
  throw new Error('[FFN Worker] UPSTASH_REDIS_URL is required');
}

const connection = new IORedis(url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
});

connection.on('connect', () => {
  console.log('[FFN Worker] Redis connected to Upstash');
});

connection.on('error', (err: Error) => {
  console.error(`[FFN Worker] Redis error: ${err.message}`);
});

export default connection;
