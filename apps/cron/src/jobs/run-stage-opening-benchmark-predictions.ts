import "../load-env";
import { createSqliteDb, listMatches } from "@llm-kicktipp/db";
import {
  acquireSchedulerLock,
  getStageReadiness,
  parseBenchmarkStage,
  releaseSchedulerLock
} from "./benchmark-scheduling";
import type { BenchmarkStage } from "./benchmark-scheduling";
import type { BenchmarkAccessCondition, BenchmarkPromptStrategy } from "./run-benchmark-predictions";
import {
  inspectBenchmarkPredictionCoverage,
  runBenchmarkPredictions
} from "./run-benchmark-predictions";

type CliArgs = {
  stage: BenchmarkStage;
  concurrency: number;
  sampleId: number;
  accessConditions: BenchmarkAccessCondition[] | null;
  promptStrategies: BenchmarkPromptStrategy[] | null;
  modelIds: string[] | null;
  dryRun: boolean;
  force: boolean;
};

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const db = createSqliteDb();
  const matches = await listMatches(db);
  const readiness = getStageReadiness(matches, args.stage);

  console.log(`Stage-opening benchmark prediction job: stage=${args.stage}; dry_run=${args.dryRun}; force=${args.force}`);
  console.log(`Stage readiness: ready=${readiness.ready}; expected=${readiness.expectedMatches}; known=${readiness.knownMatches}; reason=${readiness.reason ?? "none"}`);

  if (!readiness.ready) {
    db.close();
    throw new Error(`Stage ${args.stage} is not fully known; refusing partial-stage execution.`);
  }

  const lock = args.dryRun
    ? null
    : acquireSchedulerLock(db, `benchmark-stage-opening:${args.stage}`, 6 * 60 * 60_000);
  if (!args.dryRun && !lock) {
    console.log(`Another scheduler invocation already holds lock benchmark-stage-opening:${args.stage}; exiting.`);
    db.close();
    return;
  }

  try {
    console.log(`Selected ${readiness.matches.length} stage matches for STAGE_OPENING:`);
    for (const match of readiness.matches) {
      console.log([
        match.id,
        `${match.home_team} vs ${match.away_team}`,
        `kickoff=${match.utc_date}`
      ].join(" | "));
    }

    const before = await inspectBenchmarkPredictionCoverage(db, {
      horizon: "STAGE_OPENING",
      matches: readiness.matches,
      modelIds: args.modelIds,
      sampleId: args.sampleId,
      accessConditions: args.accessConditions,
      promptStrategies: args.promptStrategies
    });
    console.log(`Before run coverage: valid=${before.valid}; invalid=${before.invalid}; missing=${before.missing}; total=${before.total}`);

    await runBenchmarkPredictions({
      db,
      horizon: "STAGE_OPENING",
      matches: readiness.matches,
      modelIds: args.modelIds,
      sampleId: args.sampleId,
      concurrency: args.concurrency,
      accessConditions: args.accessConditions,
      promptStrategies: args.promptStrategies,
      skipExisting: !args.force,
      force: args.force,
      dryRun: args.dryRun
    });

    const afterFirstPass = await inspectBenchmarkPredictionCoverage(db, {
      horizon: "STAGE_OPENING",
      matches: readiness.matches,
      modelIds: args.modelIds,
      sampleId: args.sampleId,
      accessConditions: args.accessConditions,
      promptStrategies: args.promptStrategies
    });
    console.log(`After first pass coverage: valid=${afterFirstPass.valid}; invalid=${afterFirstPass.invalid}; missing=${afterFirstPass.missing}; total=${afterFirstPass.total}`);

    if (!args.dryRun && (afterFirstPass.missing > 0 || afterFirstPass.invalid > 0)) {
      console.log(`Starting fill pass for missing=${afterFirstPass.missing}; invalid=${afterFirstPass.invalid}.`);
      await runBenchmarkPredictions({
        db,
        horizon: "STAGE_OPENING",
        matches: readiness.matches,
        modelIds: args.modelIds,
        sampleId: args.sampleId,
        concurrency: args.concurrency,
        accessConditions: args.accessConditions,
        promptStrategies: args.promptStrategies,
        skipExisting: true,
        force: false,
        dryRun: false
      });

      const afterFillPass = await inspectBenchmarkPredictionCoverage(db, {
        horizon: "STAGE_OPENING",
        matches: readiness.matches,
        modelIds: args.modelIds,
        sampleId: args.sampleId,
        accessConditions: args.accessConditions,
        promptStrategies: args.promptStrategies
      });
      console.log(`After fill pass coverage: valid=${afterFillPass.valid}; invalid=${afterFillPass.invalid}; missing=${afterFillPass.missing}; total=${afterFillPass.total}`);
    } else {
      console.log("No fill pass needed.");
    }
  } finally {
    if (lock) {
      releaseSchedulerLock(db, lock);
    }
    db.close();
  }
}

function parseCliArgs(args: string[]): CliArgs {
  return {
    stage: parseBenchmarkStage(readArg(args, "stage")),
    concurrency: parsePositiveInt(readArg(args, "concurrency"), 3, "concurrency"),
    sampleId: parsePositiveInt(readArg(args, "sample-id"), 1, "sample-id"),
    accessConditions: parseAccessConditions(readArg(args, "access")),
    promptStrategies: parsePromptStrategies(readArg(args, "prompt-strategy") ?? readArg(args, "strategy")),
    modelIds: parseOptionalList(readArg(args, "model") ?? readArg(args, "models")),
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force")
  };
}

function readArg(args: string[], name: string): string | null {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function parseOptionalList(value: string | null): string[] | null {
  if (!value) return null;
  const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0) {
    throw new Error("Comma-separated CLI options must include at least one value.");
  }
  return Array.from(new Set(entries));
}

function parseAccessConditions(value: string | null): BenchmarkAccessCondition[] | null {
  const entries = parseOptionalList(value);
  if (!entries) return null;
  for (const entry of entries) {
    if (entry !== "closed_book" && entry !== "open_book") {
      throw new Error("Invalid --access. Use closed_book, open_book, or a comma-separated combination.");
    }
  }
  return entries as BenchmarkAccessCondition[];
}

function parsePromptStrategies(value: string | null): BenchmarkPromptStrategy[] | null {
  const entries = parseOptionalList(value);
  if (!entries) return null;
  for (const entry of entries) {
    if (entry !== "direct_score" && entry !== "probabilistic_forecast") {
      throw new Error("Invalid --prompt-strategy. Use direct_score, probabilistic_forecast, or a comma-separated combination.");
    }
  }
  return entries as BenchmarkPromptStrategy[];
}

function parsePositiveInt(value: string | null, fallback: number, name: string): number {
  const parsed = value ? Number.parseInt(value, 10) : fallback;
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid --${name}. Use a positive integer.`);
  }
  return parsed;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
