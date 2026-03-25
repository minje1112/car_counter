const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

// Redis connection configuration
const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Create AI Car Counting Queue
const aiCarCountQueue = new Queue('ai-car-counting', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100, // Keep last 100 jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
});

// Note: QueueScheduler is no longer needed in BullMQ v4+
// Scheduling is handled automatically by the Queue

// Queue events for monitoring
aiCarCountQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

aiCarCountQueue.on('waiting', (jobId) => {
  console.log(`Job ${jobId} is waiting`);
});

aiCarCountQueue.on('active', (job) => {
  console.log(`Job ${job.id} has started processing`);
});

aiCarCountQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

aiCarCountQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error:`, err.message);
});

module.exports = {
  aiCarCountQueue,
  redisConnection,
};
