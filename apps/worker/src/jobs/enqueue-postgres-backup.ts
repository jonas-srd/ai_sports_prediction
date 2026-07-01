/**
 * Purpose: Enqueues a Postgres logical backup job.
 */
import { Queue } from "bullmq";

async function main() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is required to enqueue backup jobs.");
  }

  const queue = new Queue("backups", {
    connection: parseRedisConnection(redisUrl),
    prefix: process.env.QUEUE_KEY_PREFIX ?? "{ai-sports-prediction}"
  });
  const jobId = `postgres-logical-export-${new Date().toISOString().slice(0, 10)}`;

  try {
    const job = await queue.add(
      "postgres-logical-export",
      { requestedAtUtc: new Date().toISOString() },
      {
        jobId,
        attempts: 3,
        backoff: { type: "exponential", delay: 60_000 },
        removeOnComplete: 100,
        removeOnFail: 500
      }
    );
    console.log(`Queued backup job ${job.id}`);
  } finally {
    await queue.close();
  }
}

function parseRedisConnection(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    maxRetriesPerRequest: null,
    tls: url.protocol === "rediss:" ? {} : undefined
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
