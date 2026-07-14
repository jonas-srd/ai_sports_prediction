/**
 * Purpose: Queue-backed production worker entrypoint.
 */
import { Queue, Worker } from "bullmq";
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
const predictionQueue = new Queue("predictions", { connection, prefix: queuePrefix });
const oddsQueue = new Queue("odds-refresh", { connection, prefix: queuePrefix });

const queues = [
  "fixture-sync",
  "predictions",
  "odds-refresh",
  "scoring",
  "backups",
  "outreach"
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
void registerRecurringJobs().catch((error) => {
  console.error("Could not register recurring worker jobs:", error);
});

process.on("SIGTERM", () => shutdown());
process.on("SIGINT", () => shutdown());

async function runQueuedJob(queueName: string, jobName: string, data: unknown): Promise<void> {
  if (queueName === "predictions" && jobName === "generate-upcoming-sport-api-predictions") {
    const { generateUpcomingSportApiPredictions } = await import("./jobs/generate-upcoming-sport-api-predictions");
    await generateUpcomingSportApiPredictions(db);
    return;
  }

  if (queueName === "odds-refresh" && jobName === "refresh-upcoming-bookmaker-odds") {
    const { refreshUpcomingOdds } = await import("./jobs/refresh-upcoming-odds");
    await refreshUpcomingOdds(db);
    return;
  }

  if (queueName === "backups" && jobName === "postgres-logical-export") {
    const { main } = await import("./jobs/export-postgres-backup-runner");
    await main();
    return;
  }

  if (queueName === "outreach" && jobName === "discover-editorial-prospects") {
    const { runEditorialOutreachResearch } = await import("./editorial-outreach-agent");
    const result = await runEditorialOutreachResearch(db);
    console.log("Editorial outreach research finished:", result);
    return;
  }

  if (queueName === "outreach" && jobName === "send-approved-editorial-outreach") {
    const draftId = readRequiredString(data, "draftId");
    const { sendEditorialOutreach } = await import("./jobs/send-editorial-outreach");
    await sendEditorialOutreach(draftId);
    return;
  }

  throw new Error(`No handler registered for ${queueName}:${jobName} with payload ${JSON.stringify(data)}`);
}

function readRequiredString(data: unknown, key: string): string {
  if (!data || typeof data !== "object") {
    throw new Error(`Queued job payload must be an object containing ${key}.`);
  }
  const value = (data as Record<string, unknown>)[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Queued job payload must contain a non-empty ${key}.`);
  }
  return value.trim();
}

async function registerRecurringJobs(): Promise<void> {
  const intervalMinutes = Number(process.env.PREDICTION_AUTOMATION_INTERVAL_MINUTES ?? 60);
  const every = Math.max(5, Number.isFinite(intervalMinutes) ? intervalMinutes : 60) * 60 * 1000;

  await predictionQueue.add(
    "generate-upcoming-sport-api-predictions",
    {},
    {
      jobId: "generate-upcoming-sport-api-predictions",
      repeat: { every },
      removeOnComplete: 20,
      removeOnFail: 50
    }
  );

  const oddsIntervalMinutes = Number(process.env.ODDS_REFRESH_INTERVAL_MINUTES ?? 60);
  const oddsEvery = Math.max(5, Number.isFinite(oddsIntervalMinutes) ? oddsIntervalMinutes : 60) * 60 * 1000;

  await oddsQueue.add(
    "refresh-upcoming-bookmaker-odds",
    {},
    {
      jobId: "refresh-upcoming-bookmaker-odds",
      repeat: { every: oddsEvery },
      removeOnComplete: 50,
      removeOnFail: 100
    }
  );
}

async function shutdown(): Promise<void> {
  console.log("Shutting down AI Sport Prediction worker");
  await Promise.all([...workers.map((worker) => worker.close()), predictionQueue.close(), oddsQueue.close()]);
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
