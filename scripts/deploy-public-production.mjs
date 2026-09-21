#!/usr/bin/env node
// Recovery-aware public rollout. Ordinary deployment must keep its recovery guard.
// Default: read-only plan. Apply requires --apply --acknowledge-downtime.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const CONFIG = Object.freeze({
  account: "186581960948", region: "eu-central-1", cluster: "ai-sports-prediction",
  edge: "ai-sports-prediction-edge", worker: "ai-sports-prediction-worker",
  database: "ai-sports-prediction-db-recovery-20260913",
  databaseHost: "ai-sports-prediction-db-recovery-20260913.cl44cuw6mk0e.eu-central-1.rds.amazonaws.com",
  databaseParameter: "/ai-sports-prediction/database-url",
  model: "eu.amazon.nova-2-lite-v1:0",
  repository: "ai-sports-prediction",
  baselineArn: "arn:aws:ecs:eu-central-1:186581960948:task-definition/ai-sports-prediction-edge:66",
  workerCommandSha256: "851382a4af52778abb7e6f08c481f376ee62b78435be9a7c312cfeee9f171f54",
  tunnelImage: "cloudflare/cloudflared@sha256:b269e8abd07a5bf6f3f4be65d5050b2174eca89c56a0241a8ff32a16aec454e4"
});
const APP_NAMES = ["api", "web", "worker"];
const NAMES = [...APP_NAMES, "cloudflared"].sort();
const REGISTER_FIELDS = ["family", "taskRoleArn", "executionRoleArn", "networkMode", "containerDefinitions", "volumes", "placementConstraints", "requiresCompatibilities", "cpu", "memory", "runtimePlatform", "ephemeralStorage", "proxyConfiguration", "pidMode", "ipcMode", "inferenceAccelerators", "enableFaultInjection"];
const SECRET_NAMES = { web: ["DATABASE_URL", "THE_ODDS_API_KEY", "THE_SPORTS_DB_API_KEY"], api: ["DATABASE_URL"], worker: ["DATABASE_URL", "THE_ODDS_API_KEY", "THE_SPORTS_DB_API_KEY"], cloudflared: ["TUNNEL_TOKEN"] };
const SECRET_PATHS = { DATABASE_URL: "database-url", THE_ODDS_API_KEY: "the-odds-api-key", THE_SPORTS_DB_API_KEY: "the-sports-db-api-key", TUNNEL_TOKEN: "cloudflare-tunnel-token" };
const OFF_FLAGS = ["MARKETING_AUTOMATION_ENABLED", "MARKETING_ANALYTICS_ENABLED", "REVENUE_AUTOMATION_ENABLED", "WIDGET_DIRECT_SALES_ENABLED", "WIDGET_INVOICE_DELIVERY_READY"];
const PUBLIC_BUSINESS_FLAGS = ["PUBLIC_BUSINESS_ENABLED", "NEXT_PUBLIC_PUBLIC_BUSINESS_ENABLED"];
const sha = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const check = (condition, code) => assert.ok(condition, code);
const same = (actual, expected, code) => assert.deepEqual(actual, expected, code);
const environment = (container) => Object.fromEntries((container.environment ?? []).map(({ name, value }) => [name, value]));

export function imageDigest(image) {
  const prefix = `${CONFIG.account}.dkr.ecr.${CONFIG.region}.amazonaws.com/${CONFIG.repository}@`;
  check(typeof image === "string" && image.startsWith(prefix) && /^sha256:[a-f0-9]{64}$/.test(image.slice(prefix.length)), "IMMUTABLE_LOCAL_ECR_IMAGE_REQUIRED");
  return image.slice(prefix.length);
}

export function registrationPayload(definition) {
  return structuredClone(Object.fromEntries(REGISTER_FIELDS.filter((key) => definition[key] !== undefined).map((key) => [key, definition[key]])));
}

function canonicalPayload(definition) {
  const payload = registrationPayload(definition);
  payload.containerDefinitions = payload.containerDefinitions.map((container) => {
    const copy = structuredClone(container);
    copy.environment = (copy.environment ?? []).sort((a, b) => a.name.localeCompare(b.name));
    copy.secrets = (copy.secrets ?? []).sort((a, b) => a.name.localeCompare(b.name));
    return copy;
  }).sort((a, b) => a.name.localeCompare(b.name));
  return payload;
}

function comparableProfile(definition) {
  const payload = canonicalPayload(definition);
  for (const container of payload.containerDefinitions) {
    if (APP_NAMES.includes(container.name)) container.image = "APP_IMAGE";
    if (container.name === "web") {
      // Revision 66 predates these default-off write/CTA guards. This reviewed
      // transition may make their disabled state explicit, never enable them.
      container.environment = container.environment.filter((entry) => !PUBLIC_BUSINESS_FLAGS.includes(entry.name));
      for (const entry of container.environment) {
        if (["SHOW_FULL_SITE", "NEXT_PUBLIC_SHOW_FULL_SITE"].includes(entry.name)) entry.value = "PUBLIC_FLAG";
      }
    }
  }
  return payload;
}

export function assertRecoveryProfile(definition) {
  same(definition.family, CONFIG.edge, "TASK_FAMILY_MISMATCH");
  same(definition.networkMode, "awsvpc", "NETWORK_MODE_MISMATCH");
  same(definition.requiresCompatibilities, ["FARGATE"], "FARGATE_REQUIRED");
  same(definition.runtimePlatform, { cpuArchitecture: "ARM64", operatingSystemFamily: "LINUX" }, "ARM_LINUX_REQUIRED");
  same(definition.taskRoleArn, `arn:aws:iam::${CONFIG.account}:role/ai-sports-prediction-ecs-task-role`, "TASK_ROLE_MISMATCH");
  same(definition.executionRoleArn, `arn:aws:iam::${CONFIG.account}:role/ai-sports-prediction-ecs-execution-role`, "EXECUTION_ROLE_MISMATCH");
  same(definition.containerDefinitions?.map((c) => c.name).sort(), NAMES, "CONTAINER_SET_MISMATCH");
  for (const container of definition.containerDefinitions) {
    const env = environment(container);
    for (const flag of PUBLIC_BUSINESS_FLAGS) {
      check(env[flag] === undefined || env[flag] === "0", "PUBLIC_BUSINESS_MUST_REMAIN_DISABLED");
    }
    same(Object.keys(env).length, (container.environment ?? []).length, "DUPLICATE_ENVIRONMENT_VARIABLE");
    same(container.secrets?.map((s) => s.name).sort(), SECRET_NAMES[container.name], "SECRET_ALLOWLIST_MISMATCH");
    for (const secret of container.secrets) same(secret.valueFrom, `arn:aws:ssm:${CONFIG.region}:${CONFIG.account}:parameter/ai-sports-prediction/${SECRET_PATHS[secret.name]}`, "SECRET_REFERENCE_MISMATCH");
    for (const name of Object.keys(env)) {
      check(!/SECRET|TOKEN|PASSWORD|(?:^|_)API_KEY|ENCRYPTION_KEY|ACCESS_EMAILS|TOTP|REDIS|QUEUE_|DATABASE_URL|POSTGRES_URL|^PGHOST|^AWS_(?:ACCESS|SECRET|SESSION|PROFILE|CONFIG|SHARED|ENDPOINT)|ENDPOINT_URL/.test(name), "CREDENTIAL_OR_QUEUE_ENVIRONMENT_FORBIDDEN");
    }
    same(container.logConfiguration?.logDriver, "awslogs", "AWS_LOGS_REQUIRED");
    same(container.logConfiguration?.options?.["awslogs-group"], "/ecs/ai-sports-prediction", "LOG_GROUP_MISMATCH");
    same(container.logConfiguration?.options?.["awslogs-region"], CONFIG.region, "LOG_REGION_MISMATCH");
    if (container.name === "cloudflared") {
      same(container.image, CONFIG.tunnelImage, "TUNNEL_DIGEST_MISMATCH");
      same(container.command, ["tunnel", "--no-autoupdate", "run"], "TUNNEL_COMMAND_MISMATCH");
      continue;
    }
    imageDigest(container.image);
    same(env.NODE_ENV, "production", "PRODUCTION_ENV_REQUIRED");
    same(env.SERVICE_ROLE, container.name, "SERVICE_ROLE_MISMATCH");
    same(env.DATABASE_SSL, "1", "DATABASE_TLS_REQUIRED");
    same(env.DATABASE_SSL_REJECT_UNAUTHORIZED, "1", "DATABASE_TLS_VERIFICATION_REQUIRED");
    same(env.DATABASE_SSL_CA_FILE, "/etc/ssl/certs/aws-rds-global-bundle.pem", "DATABASE_CA_MISMATCH");
    check(env.NODE_TLS_REJECT_UNAUTHORIZED !== "0", "TLS_MUST_NOT_BE_DISABLED");
    for (const flag of OFF_FLAGS) same(env[flag], "0", "BUSINESS_QUARANTINE_REQUIRED");
    same(env.MARKETING_PUBLISH_MODE, "review", "AUTOMATIC_PUBLISH_FORBIDDEN");
    same(env.OPS_ALERT_EMAILS, "", "ALERT_EMAILS_FORBIDDEN");
    same(env.SALES_ALERT_EMAILS, "", "ALERT_EMAILS_FORBIDDEN");
    check(!container.entryPoint?.length, "ENTRYPOINT_OVERRIDE_FORBIDDEN");
    if (container.name === "web") {
      check(!container.command?.length, "WEB_COMMAND_OVERRIDE_FORBIDDEN");
      check(["0", "1"].includes(env.SHOW_FULL_SITE) && env.SHOW_FULL_SITE === env.NEXT_PUBLIC_SHOW_FULL_SITE, "PUBLIC_FLAGS_MUST_AGREE");
      same(env.AI_SPORTS_API_URL, "http://127.0.0.1:3001", "INTERNAL_API_MISMATCH");
      same(env.INTERNAL_API_URL, "http://127.0.0.1:3001", "INTERNAL_API_MISMATCH");
    } else if (container.name === "api") {
      check(!container.command?.length, "API_COMMAND_OVERRIDE_FORBIDDEN");
      same(env.API_CACHE_ENABLED, "0", "REDIS_CACHE_MUST_REMAIN_DISABLED");
    } else {
      same(sha(container.command), CONFIG.workerCommandSha256, "RECOVERY_WORKER_COMMAND_MISMATCH");
      same(env.RECOVERY_WORKER_APPROVED, "production-cutover-20260913", "RECOVERY_WORKER_REQUIRED");
      same(env.RECOVERY_TARGET_HOST, CONFIG.databaseHost, "RECOVERY_HOST_MISMATCH");
      same(env.RECOVERY_TARGET_DB_IDENTIFIER, CONFIG.database, "RECOVERY_DATABASE_MISMATCH");
      same(env.RECOVERY_MAX_FIXTURES_PER_RUN, "3", "RECOVERY_LIMIT_MISMATCH");
      same(env.LLM_PROVIDER, "bedrock", "BEDROCK_REQUIRED");
      same(env.BEDROCK_MODEL_ID, CONFIG.model, "MODEL_MISMATCH");
      same(env.PUBLIC_PREDICTION_BEDROCK_MODEL, CONFIG.model, "PUBLIC_MODEL_MISMATCH");
      same(env.BEDROCK_REGION, CONFIG.region, "BEDROCK_REGION_MISMATCH");
      same(env.BACKUP_AUTOMATION_ENABLED, "1", "BACKUPS_REQUIRED");
    }
  }
  same(new Set(definition.containerDefinitions.filter((c) => APP_NAMES.includes(c.name)).map((c) => c.image)).size, 1, "APP_IMAGE_MISMATCH");
}

export function buildPublicTaskDefinition({ current, baseline, imageUri }) {
  imageDigest(imageUri);
  same(baseline.taskDefinitionArn, CONFIG.baselineArn, "TRUSTED_BASELINE_66_REQUIRED");
  assertRecoveryProfile(baseline);
  assertRecoveryProfile(current);
  // Any other drift, including unknown feature flags, commands, volumes, health
  // settings or secret injection, requires its own reviewed transition.
  same(comparableProfile(current), comparableProfile(baseline), "UNREVIEWED_RECOVERY_PROFILE_DRIFT");
  const target = registrationPayload(current);
  for (const container of target.containerDefinitions) {
    if (APP_NAMES.includes(container.name)) container.image = imageUri;
    if (container.name === "web") {
      for (const entry of container.environment) {
        if (["SHOW_FULL_SITE", "NEXT_PUBLIC_SHOW_FULL_SITE"].includes(entry.name)) entry.value = "1";
      }
      container.environment = container.environment.filter((entry) => !PUBLIC_BUSINESS_FLAGS.includes(entry.name));
      container.environment.push(...PUBLIC_BUSINESS_FLAGS.map((name) => ({ name, value: "0" })));
    }
  }
  assertRecoveryProfile(target);
  return target;
}

export function cliAws(args) {
  try {
    return JSON.parse(execFileSync("aws", ["--region", CONFIG.region, "--cli-connect-timeout", "5", "--cli-read-timeout", "30", ...args, "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 8 * 1024 * 1024 }));
  } catch {
    // Child-process error.stdout may contain decrypted SSM data. Never expose it.
    throw new Error(`AWS_${args[0]}_${args[1]}_FAILED`);
  }
}

function services(aws) {
  const result = aws(["ecs", "describe-services", "--cluster", CONFIG.cluster, "--services", CONFIG.edge, CONFIG.worker]);
  check(!result.failures?.length, "SERVICE_READ_FAILED");
  return Object.fromEntries([CONFIG.edge, CONFIG.worker].map((name) => {
    const service = result.services?.find((s) => s.serviceName === name);
    check(service?.status === "ACTIVE", "SERVICE_NOT_ACTIVE");
    return [name, service];
  }));
}

function assertWorkerOff(state) {
  const worker = state[CONFIG.worker];
  same([worker.desiredCount, worker.runningCount, worker.pendingCount], [0, 0, 0], "STANDALONE_WORKER_NOT_STOPPED");
}

function assertSingleDeployment(service, arn, count) {
  same(service.taskDefinition, arn, "SERVICE_TASK_DEFINITION_CHANGED");
  same([service.desiredCount, service.runningCount, service.pendingCount], [count, count, 0], "SERVICE_NOT_SETTLED");
  same(service.deployments?.length, 1, "MULTIPLE_DEPLOYMENTS_PRESENT");
  const deployment = service.deployments[0];
  same([deployment.status, deployment.rolloutState, deployment.taskDefinition], ["PRIMARY", "COMPLETED", arn], "DEPLOYMENT_NOT_COMPLETED");
}

function tasks(aws, arns) {
  if (!arns.length) return [];
  const result = aws(["ecs", "describe-tasks", "--cluster", CONFIG.cluster, "--tasks", ...arns]);
  check(!result.failures?.length && result.tasks?.length === arns.length, "TASK_READ_FAILED");
  return result.tasks;
}

function runningArns(aws) {
  return aws(["ecs", "list-tasks", "--cluster", CONFIG.cluster, "--desired-status", "RUNNING"]).taskArns;
}

export function prepareRollout({ aws, expectedSourceArn, imageUri }) {
  check(new RegExp(`^arn:aws:ecs:${CONFIG.region}:${CONFIG.account}:task-definition/${CONFIG.edge}:[1-9]\\d*$`).test(expectedSourceArn ?? ""), "EXPLICIT_EXPECTED_SOURCE_ARN_REQUIRED");
  imageDigest(imageUri);
  same(aws(["sts", "get-caller-identity"]).Account, CONFIG.account, "AWS_ACCOUNT_MISMATCH");
  const state = services(aws);
  assertWorkerOff(state);
  const edge = state[CONFIG.edge];
  assertSingleDeployment(edge, expectedSourceArn, 1);
  same(edge.deploymentController?.type ?? "ECS", "ECS", "UNSUPPORTED_DEPLOYMENT_CONTROLLER");
  const baseline = aws(["ecs", "describe-task-definition", "--task-definition", CONFIG.baselineArn]).taskDefinition;
  const current = expectedSourceArn === CONFIG.baselineArn ? baseline : aws(["ecs", "describe-task-definition", "--task-definition", expectedSourceArn]).taskDefinition;
  const target = buildPublicTaskDefinition({ current, baseline, imageUri });
  const db = aws(["rds", "describe-db-instances", "--db-instance-identifier", CONFIG.database]).DBInstances?.[0];
  check(db?.DBInstanceStatus === "available" && db.Endpoint?.Address === CONFIG.databaseHost && db.StorageEncrypted === true && db.PubliclyAccessible === false && db.DeletionProtection === true, "RECOVERY_DATABASE_NOT_READY");
  const parameter = aws(["ssm", "get-parameter", "--name", CONFIG.databaseParameter, "--with-decryption"]).Parameter;
  check(parameter?.Type === "SecureString" && Number.isSafeInteger(parameter.Version) && parameter.Version >= 2, "DATABASE_PARAMETER_NOT_SWITCHED");
  let database;
  try { database = new URL(parameter.Value); } catch { throw new Error("DATABASE_PARAMETER_URL_INVALID"); }
  check(["postgres:", "postgresql:"].includes(database.protocol) && database.hostname === CONFIG.databaseHost && (!database.port || database.port === "5432") && database.username && database.password, "DATABASE_PARAMETER_TARGET_MISMATCH");
  const parameterVersion = parameter.Version;
  // No parameter value or parsed connection URL leaves this function.
  const images = aws(["ecr", "describe-images", "--repository-name", CONFIG.repository, "--image-ids", `imageDigest=${imageDigest(imageUri)}`]).imageDetails;
  check(images?.length === 1 && images[0].imageDigest === imageDigest(imageUri), "ECR_DIGEST_NOT_AVAILABLE");
  const taskArns = runningArns(aws);
  same(taskArns?.length, 1, "UNEXPECTED_CLUSTER_TASKS");
  const active = tasks(aws, taskArns)[0];
  same(active.taskDefinitionArn, expectedSourceArn, "RUNNING_TASK_REVISION_MISMATCH");
  same(active.group, `service:${CONFIG.edge}`, "RUNNING_TASK_SERVICE_MISMATCH");
  same(active.lastStatus, "RUNNING", "CURRENT_TASK_NOT_RUNNING");
  same(active.containers?.map((c) => c.name).sort(), NAMES, "RUNNING_CONTAINER_SET_MISMATCH");
  check(active.containers.every((c) => c.lastStatus === "RUNNING"), "CURRENT_CONTAINER_NOT_RUNNING");
  return { snapshot: { at: new Date().toISOString(), sourceArn: expectedSourceArn, edge, worker: state[CONFIG.worker], taskArns, parameterVersion, imageUri }, target };
}

async function poll(checkState, { sleep, attempts, log }, phase) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (checkState()) return;
    if (attempt % 6 === 0) log({ phase, waiting: true });
    await sleep(5000);
  }
  throw new Error(`ROLLOUT_${phase}_TIMEOUT_REQUIRES_MANUAL_REVIEW`);
}

export async function applyRollout({ aws, prepared, persist, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), attempts = 180, log = console.log }) {
  // Rerun all read checks immediately before mutation, including source and DB.
  const fresh = prepareRollout({ aws, expectedSourceArn: prepared.snapshot.sourceArn, imageUri: prepared.snapshot.imageUri });
  same(fresh.target, prepared.target, "PLAN_TARGET_CHANGED");
  const relevantService = ({ events, ...service }) => service;
  same(relevantService(fresh.snapshot.edge), relevantService(prepared.snapshot.edge), "SERVICE_STATE_CHANGED_SINCE_PLAN");
  same(relevantService(fresh.snapshot.worker), relevantService(prepared.snapshot.worker), "WORKER_STATE_CHANGED_SINCE_PLAN");
  same(fresh.snapshot.taskArns, prepared.snapshot.taskArns, "TASKS_CHANGED_SINCE_PLAN");
  same(fresh.snapshot.parameterVersion, prepared.snapshot.parameterVersion, "DATABASE_PARAMETER_CHANGED_SINCE_PLAN");
  // Persist securely before stopping anything. A persistence failure aborts here.
  persist("snapshot", fresh.snapshot);
  const targetPath = persist("target", fresh.target);
  // Registration is inert. Verify permission and the registered payload before
  // an outage; failure must not interrupt the currently healthy service.
  const registered = aws(["ecs", "register-task-definition", "--cli-input-json", `file://${targetPath}`]).taskDefinition;
  const targetArn = registered?.taskDefinitionArn;
  check(new RegExp(`^arn:aws:ecs:${CONFIG.region}:${CONFIG.account}:task-definition/${CONFIG.edge}:[1-9]\\d*$`).test(targetArn ?? ""), "REGISTERED_ARN_INVALID");
  same(canonicalPayload(registered), canonicalPayload(fresh.target), "REGISTERED_DEFINITION_MISMATCH");
  persist("registered", { targetArn });
  const beforeStop = prepareRollout({ aws, expectedSourceArn: fresh.snapshot.sourceArn, imageUri: fresh.snapshot.imageUri });
  same(relevantService(beforeStop.snapshot.edge), relevantService(fresh.snapshot.edge), "SERVICE_CHANGED_DURING_REGISTRATION");
  same(relevantService(beforeStop.snapshot.worker), relevantService(fresh.snapshot.worker), "WORKER_CHANGED_DURING_REGISTRATION");
  same(beforeStop.snapshot.taskArns, fresh.snapshot.taskArns, "TASKS_CHANGED_DURING_REGISTRATION");
  same(beforeStop.snapshot.parameterVersion, fresh.snapshot.parameterVersion, "DATABASE_CHANGED_DURING_REGISTRATION");
  const options = { sleep, attempts, log };
  const update = (args) => aws(["ecs", "update-service", "--cluster", CONFIG.cluster, "--service", CONFIG.edge, ...args]);
  log({ phase: "stop", sourceArn: fresh.snapshot.sourceArn });
  update(["--desired-count", "0"]);
  await poll(() => {
    const state = services(aws); assertWorkerOff(state);
    same(state[CONFIG.edge].taskDefinition, fresh.snapshot.sourceArn, "CONCURRENT_TASK_DEFINITION_CHANGE");
    return tasks(aws, fresh.snapshot.taskArns).every((t) => t.lastStatus === "STOPPED")
      && state[CONFIG.edge].desiredCount === 0 && state[CONFIG.edge].runningCount === 0 && state[CONFIG.edge].pendingCount === 0 && runningArns(aws).length === 0;
  }, options, "OLD_TASKS_STOPPED");
  update(["--task-definition", targetArn, "--desired-count", "0"]);
  await poll(() => {
    const state = services(aws); assertWorkerOff(state);
    same(state[CONFIG.edge].desiredCount, 0, "CONCURRENT_SERVICE_CAPACITY_CHANGE");
    check(runningArns(aws).length === 0, "UNEXPECTED_TASK_STARTED_DURING_REVISION_CHANGE");
    try { assertSingleDeployment(state[CONFIG.edge], targetArn, 0); return true; } catch { return false; }
  }, options, "ZERO_CAPACITY_REVISION_SETTLED");
  // Deliberately a separate update, after exactly one completed target deployment.
  update(["--desired-count", "1"]);
  await poll(() => {
    const state = services(aws); assertWorkerOff(state);
    same(state[CONFIG.edge].taskDefinition, targetArn, "CONCURRENT_TASK_DEFINITION_CHANGE");
    try { assertSingleDeployment(state[CONFIG.edge], targetArn, 1); } catch { return false; }
    const arns = runningArns(aws);
    if (arns.length !== 1) return false;
    const task = tasks(aws, arns)[0];
    if (task.taskDefinitionArn !== targetArn || task.lastStatus !== "RUNNING") return false;
    same(task.group, `service:${CONFIG.edge}`, "TARGET_TASK_SERVICE_MISMATCH");
    if (task.containers?.length !== 4 || !task.containers.every((c) => c.lastStatus === "RUNNING" && c.healthStatus !== "UNHEALTHY")) return false;
    same(task.containers.map((c) => c.name).sort(), NAMES, "TARGET_CONTAINER_SET_MISMATCH");
    for (const container of task.containers) {
      same(container.image, container.name === "cloudflared" ? CONFIG.tunnelImage : fresh.snapshot.imageUri, "RUNNING_IMAGE_MISMATCH");
      check(/^sha256:[a-f0-9]{64}$/.test(container.imageDigest ?? ""), "RESOLVED_IMAGE_DIGEST_REQUIRED");
    }
    const evidence = { targetArn, taskArn: task.taskArn, imageUri: fresh.snapshot.imageUri, resolvedDigests: Object.fromEntries(task.containers.map((c) => [c.name, c.imageDigest])), parameterVersion: fresh.snapshot.parameterVersion, publicSiteEnabled: true, businessQuarantineRetained: true, externalAcceptanceStillRequired: true };
    persist("running", evidence);
    log({ phase: "containers_running", ...evidence });
    return true;
  }, options, "ALL_CONTAINERS_RUNNING");
  return targetArn;
  // No automatic rollback: restarting revision 65 or an unknown profile could
  // reactivate business side effects against recovered data.
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    check(args.every((arg) => ["--apply", "--acknowledge-downtime"].includes(arg)), "UNRECOGNIZED_ARGUMENT");
    if (args.includes("--apply")) check(args.includes("--acknowledge-downtime"), "EXPLICIT_DOWNTIME_ACKNOWLEDGEMENT_REQUIRED");
    const prepared = prepareRollout({ aws: cliAws, expectedSourceArn: process.env.EXPECTED_SOURCE_TASK_DEFINITION, imageUri: process.env.ECR_IMAGE_URI });
    console.log(JSON.stringify({ phase: "plan", sourceArn: prepared.snapshot.sourceArn, imageUri: prepared.snapshot.imageUri, targetHash: sha(prepared.target), parameterVersion: prepared.snapshot.parameterVersion, desiredCount: 1, fullPublicSite: true, businessQuarantineRetained: true, architectureMustBeVerifiedByImageBuild: "linux/arm64", apply: args.includes("--apply") }));
    if (args.includes("--apply")) {
      check(process.env.ROLLOUT_EVIDENCE_DIRECTORY, "ROLLOUT_EVIDENCE_DIRECTORY_REQUIRED");
      const directory = resolve(process.env.ROLLOUT_EVIDENCE_DIRECTORY);
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      const persist = (name, value) => {
        const path = resolve(directory, `${name}.json`);
        writeFileSync(path, JSON.stringify(value, null, 2), { mode: 0o600, flag: "wx" });
        return path;
      };
      await applyRollout({ aws: cliAws, prepared, persist, log: (value) => console.log(JSON.stringify(value)) });
    }
  } catch (error) {
    // Assert errors can carry actual values. Emit the fixed check only.
    console.error(String(error.message ?? "PUBLIC_ROLLOUT_FAILED").split("\n")[0]);
    process.exitCode = 1;
  }
}
