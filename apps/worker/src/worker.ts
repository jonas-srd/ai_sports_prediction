/**
 * Purpose: Queue-backed production worker entrypoint.
 */
import { Worker } from "bullmq";
import {
  createPostgresPool,
  upsertJobAttempt
} from "@ai-sports-prediction/db";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is required for the queue worker.");
}

const connection = parseRedisConnection(process.env.REDIS_URL);
const db = createPostgresPool();
const queuePrefix = process.env.QUEUE_KEY_PREFIX ?? "{ai-sports-prediction}";

const queues = [
  "fixture-sync",
  "predictions",
  "scoring",
  "backups"
];

const workers = queues.map((queueName) => new Worker(
  queueName,
  async (job) => {
    const startedAtUtc = new Date().toISOString();
    const idempotencyKey = String(job.opts.jobId ?? job.id ?? `${queueName}:${job.name}`);

    await upsertJobAttempt(db, {
      queueName,
      jobName: job.name,
      idempotencyKey,
      payload: job.data,
      status: "running",
      attempt: job.attemptsMade + 1,
      startedAtUtc
    });

    try {
      await runQueuedJob(queueName, job.name, job.data);
      await upsertJobAttempt(db, {
        queueName,
        jobName: job.name,
        idempotencyKey,
        payload: job.data,
        status: "succeeded",
        attempt: job.attemptsMade + 1,
        startedAtUtc,
        finishedAtUtc: new Date().toISOString()
      });
    } catch (error) {
      await upsertJobAttempt(db, {
        queueName,
        jobName: job.name,
        idempotencyKey,
        payload: job.data,
        status: "failed",
        attempt: job.attemptsMade + 1,
        startedAtUtc,
        finishedAtUtc: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack ?? null : null
      });
      throw error;
    }
  },
  { connection, prefix: queuePrefix }
));

console.log(`AI Sport Prediction worker listening on queues: ${queues.join(", ")}`);

process.on("SIGTERM", () => shutdown());
process.on("SIGINT", () => shutdown());

async function runQueuedJob(queueName: string, jobName: string, data: unknown): Promise<void> {
  if (queueName === "backups" && jobName === "postgres-logical-export") {
    const { main } = await import("./jobs/export-postgres-backup-runner");
    await main();
    return;
  }

  throw new Error(`No handler registered for ${queueName}:${jobName} with payload ${JSON.stringify(data)}`);
}

async function shutdown(): Promise<void> {
  console.log("Shutting down AI Sport Prediction worker");
  await Promise.all(workers.map((worker) => worker.close()));
  await db.end();
  process.exit(0);
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
