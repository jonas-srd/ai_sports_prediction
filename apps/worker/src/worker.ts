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
const marketingQueue = new Queue("marketing", { connection, prefix: queuePrefix });
const fixtureQueue = new Queue("fixture-sync", { connection, prefix: queuePrefix });
const backupQueue = new Queue("backups", { connection, prefix: queuePrefix });

const queues = [
  "fixture-sync",
  "predictions",
  "odds-refresh",
  "scoring",
  "backups",
  "outreach",
  "marketing"
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
      const { sendOperationsAlert } = await import("./ops-alerts");
      await sendOperationsAlert({ error, jobName: job.name, queueName }).catch((alertError) => {
        console.error("Could not send operations alert:", alertError);
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
  if (queueName === "fixture-sync" && jobName === "sync-upcoming-sport-fixtures") {
    const { syncUpcomingSportFixtures } = await import("./jobs/sync-upcoming-sport-fixtures");
    await syncUpcomingSportFixtures(db);
    return;
  }

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
    const result = await runEditorialOutreachResearch(db, readOutreachResearchOptions(data));
    console.log("Editorial outreach research finished:", result);
    return;
  }

  if (queueName === "outreach" && jobName === "send-approved-editorial-outreach") {
    const draftId = readRequiredString(data, "draftId");
    const { sendEditorialOutreach } = await import("./jobs/send-editorial-outreach");
    await sendEditorialOutreach(draftId);
    return;
  }

  if (queueName === "marketing" && jobName === "generate-marketing-campaigns") {
    const { runMarketingCampaignGeneration } = await import("./marketing-agent");
    const result = await runMarketingCampaignGeneration(db);
    console.log("Marketing campaign generation finished:", result);

    if ((process.env.MARKETING_PUBLISH_MODE ?? "review").trim().toLowerCase() === "auto") {
      const { approveMarketingCampaign, publishMarketingCampaign } = await import("./marketing-publishers");
      for (const campaignId of result.campaignIds) {
        await approveMarketingCampaign(db, campaignId, "marketing-agent:auto");
        await publishMarketingCampaign(db, campaignId);
      }
    }
    return;
  }

  if (queueName === "marketing" && jobName === "publish-approved-marketing-campaigns") {
    const { publishApprovedMarketingCampaigns } = await import("./marketing-publishers");
    const results = await publishApprovedMarketingCampaigns(db);
    console.log("Approved marketing campaign publishing finished:", results);
    return;
  }

  if (queueName === "marketing" && jobName === "analyze-marketing-performance") {
    const { runMarketingPerformanceAgent } = await import("./marketing-performance-agent");
    const result = await runMarketingPerformanceAgent(db);
    console.log("Marketing performance analysis finished:", result);
    return;
  }

  throw new Error(`No handler registered for ${queueName}:${jobName} with payload ${JSON.stringify(data)}`);
}

function readOutreachResearchOptions(data: unknown): {
  country?: string;
  searchLanguage?: string;
  emailLanguage?: "de" | "en" | "es" | "fr" | "it" | "nl";
} {
  const row = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const emailLanguage = readOptionalString(row.emailLanguage);
  return {
    country: readOptionalString(row.country),
    searchLanguage: readOptionalString(row.searchLanguage),
    emailLanguage: emailLanguage === "de" || emailLanguage === "en" || emailLanguage === "es" || emailLanguage === "fr" || emailLanguage === "it" || emailLanguage === "nl"
      ? emailLanguage
      : undefined
  };
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
  const fixtureIntervalMinutes = Number(process.env.FIXTURE_SYNC_INTERVAL_MINUTES ?? 15);
  const fixtureEvery = Math.max(
    5,
    Number.isFinite(fixtureIntervalMinutes) ? fixtureIntervalMinutes : 15
  ) * 60 * 1000;
  await fixtureQueue.add(
    "sync-upcoming-sport-fixtures",
    {},
    {
      jobId: "sync-upcoming-sport-fixtures",
      repeat: { every: fixtureEvery },
      attempts: 3,
      backoff: { type: "exponential", delay: 60_000 },
      removeOnComplete: 50,
      removeOnFail: 100
    }
  );

  const intervalMinutes = Number(process.env.PREDICTION_AUTOMATION_INTERVAL_MINUTES ?? 60);
  const every = Math.max(5, Number.isFinite(intervalMinutes) ? intervalMinutes : 60) * 60 * 1000;

  await predictionQueue.add(
    "generate-upcoming-sport-api-predictions",
    {},
    {
      jobId: "generate-upcoming-sport-api-predictions",
      repeat: { every },
      attempts: 3,
      backoff: { type: "exponential", delay: 60_000 },
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
      attempts: 3,
      backoff: { type: "exponential", delay: 60_000 },
      removeOnComplete: 50,
      removeOnFail: 100
    }
  );

  if (readBooleanEnv(process.env.BACKUP_AUTOMATION_ENABLED ?? "1")) {
    const backupIntervalHours = Number(process.env.BACKUP_AUTOMATION_INTERVAL_HOURS ?? 24);
    const backupEvery = Math.max(
      6,
      Number.isFinite(backupIntervalHours) ? backupIntervalHours : 24
    ) * 60 * 60 * 1000;
    await backupQueue.add(
      "postgres-logical-export",
      {},
      {
        jobId: "postgres-logical-export",
        repeat: { every: backupEvery },
        attempts: 3,
        backoff: { type: "exponential", delay: 5 * 60_000 },
        removeOnComplete: 30,
        removeOnFail: 100
      }
    );
  }

  if (readBooleanEnv(process.env.MARKETING_AUTOMATION_ENABLED)) {
    const marketingIntervalMinutes = Number(process.env.MARKETING_AUTOMATION_INTERVAL_MINUTES ?? 180);
    const marketingEvery = Math.max(
      15,
      Number.isFinite(marketingIntervalMinutes) ? marketingIntervalMinutes : 180
    ) * 60 * 1000;
    await marketingQueue.add(
      "generate-marketing-campaigns",
      {},
      {
        jobId: "generate-marketing-campaigns",
        repeat: { every: marketingEvery },
        removeOnComplete: 50,
        removeOnFail: 100
      }
    );
  }

  if (readBooleanEnv(process.env.MARKETING_ANALYTICS_ENABLED)) {
    const analyticsIntervalMinutes = Number(process.env.MARKETING_ANALYTICS_INTERVAL_MINUTES ?? 360);
    const analyticsEvery = Math.max(
      30,
      Number.isFinite(analyticsIntervalMinutes) ? analyticsIntervalMinutes : 360
    ) * 60 * 1000;
    await marketingQueue.add(
      "analyze-marketing-performance",
      {},
      {
        jobId: "analyze-marketing-performance",
        repeat: { every: analyticsEvery },
        removeOnComplete: 50,
        removeOnFail: 100
      }
    );
  }
}

async function shutdown(): Promise<void> {
  console.log("Shutting down AI Sport Prediction worker");
  await Promise.all([
    ...workers.map((worker) => worker.close()),
    predictionQueue.close(),
    oddsQueue.close(),
    marketingQueue.close(),
    fixtureQueue.close(),
    backupQueue.close()
  ]);
  await db.end();
  process.exit(0);
}

function readBooleanEnv(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
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
