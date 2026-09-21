import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONFIG, assertRecoveryProfile, buildPublicTaskDefinition, imageDigest, prepareRollout, applyRollout } from "./deploy-public-production.mjs";

const image = (character) => `${CONFIG.account}.dkr.ecr.${CONFIG.region}.amazonaws.com/${CONFIG.repository}@sha256:${character.repeat(64)}`;
const targetImage = image("a");
const targetArn = CONFIG.baselineArn.replace(":66", ":67");
const initialTask = `arn:aws:ecs:${CONFIG.region}:${CONFIG.account}:task/${CONFIG.cluster}/oldtask`;
const targetTask = initialTask.replace("oldtask", "newtask");
const workerCommand = ["node", "--import", "tsx", "--input-type=module", "-e", `${readFileSync(new URL("./recovery-worker.mjs", import.meta.url), "utf8")}\nawait main();`];
const secret = (name, path) => ({ name, valueFrom: `arn:aws:ssm:${CONFIG.region}:${CONFIG.account}:parameter/ai-sports-prediction/${path}` });

function fixture() {
  const standard = { NODE_ENV: "production", DATABASE_SSL: "1", DATABASE_SSL_REJECT_UNAUTHORIZED: "1", DATABASE_SSL_CA_FILE: "/etc/ssl/certs/aws-rds-global-bundle.pem", MARKETING_AUTOMATION_ENABLED: "0", MARKETING_ANALYTICS_ENABLED: "0", REVENUE_AUTOMATION_ENABLED: "0", WIDGET_DIRECT_SALES_ENABLED: "0", WIDGET_INVOICE_DELIVERY_READY: "0", OPS_ALERT_EMAILS: "", SALES_ALERT_EMAILS: "", MARKETING_PUBLISH_MODE: "review" };
  const db = secret("DATABASE_URL", "database-url");
  const sports = [db, secret("THE_ODDS_API_KEY", "the-odds-api-key"), secret("THE_SPORTS_DB_API_KEY", "the-sports-db-api-key")];
  const env = {
    web: { ...standard, SERVICE_ROLE: "web", SHOW_FULL_SITE: "0", NEXT_PUBLIC_SHOW_FULL_SITE: "0", AI_SPORTS_API_URL: "http://127.0.0.1:3001", INTERNAL_API_URL: "http://127.0.0.1:3001" },
    api: { ...standard, SERVICE_ROLE: "api", API_CACHE_ENABLED: "0" },
    worker: { ...standard, SERVICE_ROLE: "worker", RECOVERY_WORKER_APPROVED: "production-cutover-20260913", RECOVERY_TARGET_HOST: CONFIG.databaseHost, RECOVERY_TARGET_DB_IDENTIFIER: CONFIG.database, RECOVERY_MAX_FIXTURES_PER_RUN: "3", LLM_PROVIDER: "bedrock", BEDROCK_MODEL_ID: CONFIG.model, PUBLIC_PREDICTION_BEDROCK_MODEL: CONFIG.model, BEDROCK_REGION: CONFIG.region, BACKUP_AUTOMATION_ENABLED: "1" },
    cloudflared: { TUNNEL_TRANSPORT_PROTOCOL: "http2" }
  };
  return {
    taskDefinitionArn: CONFIG.baselineArn, revision: 66, status: "ACTIVE", family: CONFIG.edge,
    taskRoleArn: `arn:aws:iam::${CONFIG.account}:role/ai-sports-prediction-ecs-task-role`,
    executionRoleArn: `arn:aws:iam::${CONFIG.account}:role/ai-sports-prediction-ecs-execution-role`,
    networkMode: "awsvpc", requiresCompatibilities: ["FARGATE"], cpu: "1024", memory: "2048",
    runtimePlatform: { cpuArchitecture: "ARM64", operatingSystemFamily: "LINUX" },
    containerDefinitions: Object.entries(env).map(([name, environment]) => ({ name,
      image: name === "cloudflared" ? CONFIG.tunnelImage : image("b"),
      environment: Object.entries(environment).map(([name, value]) => ({ name, value })),
      secrets: structuredClone(name === "cloudflared" ? [secret("TUNNEL_TOKEN", "cloudflare-tunnel-token")] : name === "api" ? [db] : sports),
      ...(name === "worker" ? { command: structuredClone(workerCommand) } : name === "cloudflared" ? { command: ["tunnel", "--no-autoupdate", "run"] } : {}),
      logConfiguration: { logDriver: "awslogs", options: { "awslogs-group": "/ecs/ai-sports-prediction", "awslogs-region": CONFIG.region, "awslogs-stream-prefix": `edge-${name}` } }
    }))
  };
}
const container = (definition, name) => definition.containerDefinitions.find((c) => c.name === name);
function setEnv(definition, name, key, value) {
  const env = container(definition, name).environment;
  const entry = env.find((e) => e.name === key);
  if (entry) entry.value = value;
  else env.push({ name: key, value });
}
const build = (current = fixture(), baseline = fixture()) => buildPublicTaskDefinition({ current, baseline, imageUri: targetImage });

test("builder changes app images/public visibility and explicitly retains disabled public business guards", () => {
  const current = fixture();
  const before = structuredClone(current);
  const result = build(current);
  assert.deepEqual(current, before);
  assert.equal(result.taskDefinitionArn, undefined);
  for (const name of ["web", "api", "worker"]) assert.equal(container(result, name).image, targetImage);
  const env = Object.fromEntries(container(result, "web").environment.map((e) => [e.name, e.value]));
  assert.equal(env.SHOW_FULL_SITE, "1");
  assert.equal(env.NEXT_PUBLIC_SHOW_FULL_SITE, "1");
  assert.equal(env.PUBLIC_BUSINESS_ENABLED, "0");
  assert.equal(env.NEXT_PUBLIC_PUBLIC_BUSINESS_ENABLED, "0");
  assert.deepEqual(container(result, "worker").command, workerCommand);
  assert.deepEqual(container(result, "cloudflared"), container(before, "cloudflared"));
  assert.equal(container(result, "api").environment.find((e) => e.name === "API_CACHE_ENABLED").value, "0");
});

test("public business guards accept only absent or disabled, never enabled or ambiguous values", () => {
  for (const name of ["PUBLIC_BUSINESS_ENABLED", "NEXT_PUBLIC_PUBLIC_BUSINESS_ENABLED"]) {
    const disabled = fixture();
    setEnv(disabled, "web", name, "0");
    assert.doesNotThrow(() => build(disabled));
    for (const value of ["1", "true", "yes", ""]) {
      const enabled = fixture();
      setEnv(enabled, "web", name, value);
      assert.throws(() => build(enabled), /PUBLIC_BUSINESS_MUST_REMAIN_DISABLED/);
      assert.throws(() => assertRecoveryProfile(enabled), /PUBLIC_BUSINESS_MUST_REMAIN_DISABLED/);
    }
  }
});

test("only exact account/region/repository SHA256 images are accepted", () => {
  for (const value of [undefined, "", targetImage.replace("@sha256:", ":"), targetImage.replace(CONFIG.account, "000000000000"), targetImage.replace(CONFIG.region, "us-east-1"), targetImage.replace(CONFIG.repository, "another"), targetImage + "x"]) assert.throws(() => imageDigest(value));
  assert.equal(imageDigest(targetImage), `sha256:${"a".repeat(64)}`);
});

test("known public recovery revisions can roll forward while all other drift fails closed", () => {
  const baseline = fixture();
  const current = { ...build(), taskDefinitionArn: targetArn };
  assert.doesNotThrow(() => build(current, baseline));
  for (const change of [
    (d) => { d.memory = "4096"; },
    (d) => { d.volumes = [{ name: "unknown" }]; },
    (d) => setEnv(d, "web", "NEW_FEATURE_ENABLED", "1"),
    (d) => { container(d, "web").healthCheck = { command: ["CMD", "true"] }; }
  ]) {
    const definition = fixture(); change(definition);
    assert.throws(() => build(definition), /UNREVIEWED_RECOVERY_PROFILE_DRIFT/);
  }
  baseline.taskDefinitionArn = targetArn;
  assert.throws(() => build(fixture(), baseline), /TRUSTED_BASELINE/);
});

test("unsafe worker, credentials, old queues, secrets and TLS cannot pass profile inspection", () => {
  for (const change of [
    (d) => { container(d, "worker").command = ["npm", "run", "worker"]; },
    (d) => setEnv(d, "worker", "RECOVERY_TARGET_HOST", "old.example.com"),
    (d) => setEnv(d, "worker", "BEDROCK_MODEL_ID", "other-model"),
    (d) => setEnv(d, "worker", "RESEND_API_KEY", "not-a-real-key"),
    (d) => setEnv(d, "worker", "QUEUE_KEY_PREFIX", "old-production"),
    (d) => setEnv(d, "api", "API_CACHE_ENABLED", "1"),
    (d) => setEnv(d, "web", "DATABASE_SSL_REJECT_UNAUTHORIZED", "0"),
    (d) => setEnv(d, "worker", "REVENUE_AUTOMATION_ENABLED", "1"),
    (d) => { container(d, "web").secrets.push(secret("ADMIN_API_TOKEN", "admin-api-token")); },
    (d) => { container(d, "api").secrets[0].valueFrom += "-other"; },
    (d) => { container(d, "worker").entryPoint = ["sh", "-c"]; },
    (d) => { container(d, "web").environment.push({ name: "SHOW_FULL_SITE", value: "1" }); },
    (d) => { container(d, "cloudflared").image = "cloudflare/cloudflared:latest"; }
  ]) {
    const definition = fixture(); change(definition);
    assert.throws(() => assertRecoveryProfile(definition));
  }
});

function fakeAws({ account = CONFIG.account, dbHost = CONFIG.databaseHost, stopNeverCompletes = false, missingImage = false, allRunning = true } = {}) {
  const baseline = fixture();
  const target = build();
  const network = { awsvpcConfiguration: { subnets: ["subnet-existing"], securityGroups: ["sg-existing"], assignPublicIp: "ENABLED" } };
  const service = (name, arn, count) => ({ serviceName: name, status: "ACTIVE", taskDefinition: arn, desiredCount: count, runningCount: count, pendingCount: 0,
    networkConfiguration: network, deployments: [{ id: "deployment-1", status: "PRIMARY", rolloutState: "COMPLETED", taskDefinition: arn }] });
  const state = { edge: service(CONFIG.edge, CONFIG.baselineArn, 1), worker: service(CONFIG.worker, CONFIG.baselineArn.replace("edge:66", "worker:23"), 0), stopped: false, started: false, revisionWaits: 0 };
  const calls = [];
  const argument = (args, key) => args[args.indexOf(key) + 1];
  const makeTask = (arn, definition, status) => ({ taskArn: arn, taskDefinitionArn: definition, group: `service:${CONFIG.edge}`, lastStatus: status,
    containers: ["web", "api", "worker", "cloudflared"].map((name) => ({ name, image: name === "cloudflared" ? CONFIG.tunnelImage : state.started ? targetImage : image("b"), imageDigest: `sha256:${"c".repeat(64)}`, lastStatus: status === "RUNNING" && name === "worker" && state.started && !allRunning ? "STOPPED" : status })) });
  return { calls, state, aws(args) {
    calls.push(args);
    switch (`${args[0]} ${args[1]}`) {
      case "sts get-caller-identity": return { Account: account };
      case "ecs describe-services": {
        if (state.edge.taskDefinition === targetArn && state.edge.desiredCount === 0 && state.revisionWaits++ > 0) state.edge.deployments = [{ id: "deployment-2", status: "PRIMARY", rolloutState: "COMPLETED", taskDefinition: targetArn }];
        return { services: structuredClone([state.edge, state.worker]), failures: [] };
      }
      case "ecs describe-task-definition": return { taskDefinition: baseline };
      case "rds describe-db-instances": return { DBInstances: [{ DBInstanceStatus: "available", Endpoint: { Address: CONFIG.databaseHost }, StorageEncrypted: true, PubliclyAccessible: false, DeletionProtection: true }] };
      case "ssm get-parameter": return { Parameter: { Type: "SecureString", Version: 2, Value: `postgresql://placeholder:private-test-value@${dbHost}/sports` } };
      case "ecr describe-images": return { imageDetails: missingImage ? [] : [{ imageDigest: imageDigest(targetImage) }] };
      case "ecs list-tasks": return { taskArns: state.started ? [targetTask] : state.stopped ? [] : [initialTask] };
      case "ecs describe-tasks": return { tasks: args.slice(args.indexOf("--tasks") + 1).map((arn) => makeTask(arn, arn === targetTask ? targetArn : CONFIG.baselineArn, arn === initialTask && state.stopped ? "STOPPED" : "RUNNING")), failures: [] };
      case "ecs register-task-definition":
        assert.equal(state.stopped, false, "inert registration is verified before an outage");
        return { taskDefinition: { ...target, taskDefinitionArn: targetArn } };
      case "ecs update-service": {
        assert.equal(argument(args, "--service"), CONFIG.edge);
        const count = Number(argument(args, "--desired-count"));
        if (args.includes("--task-definition")) {
          assert.equal(count, 0, "revision change must retain zero capacity");
          assert.equal(state.stopped, true);
          state.edge.taskDefinition = argument(args, "--task-definition");
          state.edge.deployments.push({ id: "deployment-2", status: "PRIMARY", rolloutState: "IN_PROGRESS", taskDefinition: targetArn });
        } else if (count === 0 && !stopNeverCompletes) state.stopped = true;
        else if (count === 1) {
          assert.equal(state.edge.deployments.length, 1, "must wait for a single completed target rollout");
          assert.equal(state.edge.deployments[0].rolloutState, "COMPLETED");
          state.started = true;
        }
        state.edge.desiredCount = count;
        state.edge.runningCount = stopNeverCompletes ? 1 : count;
        return { service: structuredClone(state.edge) };
      }
      default: throw new Error(`UNEXPECTED_AWS_CALL ${args.join(" ")}`);
    }
  } };
}
const prepare = (mock) => prepareRollout({ aws: mock.aws, expectedSourceArn: CONFIG.baselineArn, imageUri: targetImage });

test("default planning is read-only, checks current DB target, and never returns secret values", () => {
  const mock = fakeAws();
  const plan = prepare(mock);
  assert.equal(JSON.stringify(plan).includes("private-test-value"), false);
  assert.equal(mock.calls.some((a) => ["update-service", "register-task-definition"].includes(a[1])), false);
  for (const options of [{ account: "000000000000" }, { dbHost: "old.example.com" }, { missingImage: true }]) assert.throws(() => prepare(fakeAws(options)));
  assert.throws(() => prepareRollout({ aws: mock.aws, imageUri: targetImage }), /EXPLICIT_EXPECTED/);
});

test("apply snapshots before stop and separates stopped revision switch from single-task startup", async () => {
  const mock = fakeAws();
  const persisted = [];
  const prepared = prepare(mock);
  const result = await applyRollout({ aws: mock.aws, prepared,
    persist(name, value) { if (name === "snapshot") assert.equal(mock.calls.some((a) => a[1] === "update-service"), false); persisted.push([name, value]); return `/private/tmp/test/${name}.json`; },
    sleep: async () => {}, log() {}, attempts: 3 });
  assert.equal(result, targetArn);
  assert.deepEqual(persisted.map(([name]) => name), ["snapshot", "target", "registered", "running"]);
  const updates = mock.calls.filter((a) => a[1] === "update-service");
  assert.equal(updates.length, 3);
  assert.deepEqual(updates.map((a) => a.at(-1)), ["0", "0", "1"]);
  assert.equal(updates[0].includes("--task-definition"), false);
  assert.equal(updates[1].includes("--task-definition"), true);
  assert.equal(updates[2].includes("--task-definition"), false);
  assert.equal(mock.state.worker.desiredCount, 0);
});

test("persistence failure and stale plan abort before mutations", async () => {
  for (const kind of ["persist", "stale"]) {
    const mock = fakeAws();
    const prepared = prepare(mock);
    if (kind === "stale") mock.state.edge.networkConfiguration.awsvpcConfiguration.assignPublicIp = "DISABLED";
    await assert.rejects(applyRollout({ aws: mock.aws, prepared, persist() { throw new Error("PERSIST_FAILED"); }, sleep: async () => {}, log() {}, attempts: 1 }));
    assert.equal(mock.calls.some((a) => a[1] === "update-service" || a[1] === "register-task-definition"), false);
  }
});

test("registration or readback failure does not interrupt the healthy source service", async () => {
  for (const mode of ["denied", "changed"]) {
    const mock = fakeAws();
    const prepared = prepare(mock);
    const aws = (args) => {
      if (args[1] === "register-task-definition" && mode === "denied") throw new Error("REGISTER_DENIED");
      const response = mock.aws(args);
      if (args[1] === "register-task-definition") response.taskDefinition.memory = "4096";
      return response;
    };
    await assert.rejects(applyRollout({ aws, prepared, persist: (name) => `/private/tmp/${name}.json`, sleep: async () => {}, log() {}, attempts: 1 }));
    assert.equal(mock.calls.some((a) => a[1] === "update-service"), false);
    assert.equal(mock.state.edge.runningCount, 1);
  }
});

test("actual STOPPED status is required, and a timeout never switches revisions, restarts or rolls back", async () => {
  const mock = fakeAws({ stopNeverCompletes: true });
  await assert.rejects(applyRollout({ aws: mock.aws, prepared: prepare(mock), persist: (name) => `/private/tmp/${name}.json`, sleep: async () => {}, log() {}, attempts: 2 }), /OLD_TASKS_STOPPED_TIMEOUT/);
  assert.equal(mock.calls.filter((a) => a[1] === "update-service").length, 1);
  assert.equal(mock.state.edge.taskDefinition, CONFIG.baselineArn);
});

test("stable ECS with a stopped nonessential recovery worker is not success", async () => {
  const mock = fakeAws({ allRunning: false });
  const persisted = [];
  await assert.rejects(applyRollout({ aws: mock.aws, prepared: prepare(mock), persist: (name) => { persisted.push(name); return `/private/tmp/${name}.json`; }, sleep: async () => {}, log() {}, attempts: 3 }), /ALL_CONTAINERS_RUNNING_TIMEOUT/);
  assert.equal(persisted.includes("running"), false);
  assert.equal(mock.calls.filter((a) => a[1] === "update-service").length, 3, "no automatic unsafe rollback");
});
