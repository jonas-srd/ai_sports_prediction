import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { captureServiceState } from "./capture-aws-service-state.mjs";
import { currentServices, previousServices, rollbackServices, serviceConfiguration } from "./rollback-aws-services.mjs";

const configuration = serviceConfiguration({});
const arn = (family, revision) => `arn:aws:ecs:${configuration.region}:${configuration.accountId}:task-definition/${family}:${revision}`;
const previous = {
  PREVIOUS_EDGE_TASK_DEFINITION: arn("edge", 65), PREVIOUS_EDGE_DESIRED_COUNT: "2",
  PREVIOUS_WORKER_TASK_DEFINITION: arn("worker", 23), PREVIOUS_WORKER_DESIRED_COUNT: "0"
};
const services = () => [
  { serviceName: configuration.edge, status: "ACTIVE", taskDefinition: arn("edge", 65), desiredCount: 2 },
  { serviceName: configuration.worker, status: "ACTIVE", taskDefinition: arn("worker", 23), desiredCount: 0 }
];

function fakeAws({ state = services(), definition = { containerDefinitions: [{ name: "worker", environment: [] }] }, failures = [], failUpdate, failWait = false, account = configuration.accountId } = {}) {
  const calls = [];
  const aws = (args) => {
    calls.push(args);
    if (args[0] === "sts") return account;
    if (args[1] === "describe-services") return JSON.stringify({ services: state, failures });
    if (args[1] === "describe-task-definition") return JSON.stringify(definition);
    if (args[1] === "update-service") {
      if (args[args.indexOf("--service") + 1] === failUpdate) throw new Error("simulated update failure");
      return "{}";
    }
    if (args[1] === "wait") {
      if (failWait) throw new Error("simulated stability timeout");
      return "";
    }
    throw new Error(`Unexpected command: ${args.join(" ")}`);
  };
  return { aws, calls };
}

function runRollback(mock, environment = previous) {
  return rollbackServices({ aws: mock.aws, configuration, environment, log: () => {} });
}
const updates = (mock) => mock.calls.filter((args) => args[1] === "update-service");
const argument = (args, flag) => args[args.indexOf(flag) + 1];

test("snapshot preserves exact task definitions and capacity including dormant worker zero", () => {
  const mock = fakeAws();
  assert.equal(captureServiceState({ aws: mock.aws, configuration }),
    `edge=${arn("edge", 65)}\nedge_desired_count=2\nworker=${arn("worker", 23)}\nworker_desired_count=0\n`);
  assert.equal(updates(mock).length, 0);
  // Only inspect the active edge profile; a dormant worker image may no longer exist.
  assert.deepEqual(mock.calls.filter((args) => args[1] === "describe-task-definition").map((args) => argument(args, "--task-definition")), [arn("edge", 65)]);
});

test("migration-only failure or pre-service deployment failure is a no-op, with no image lookup or wait", () => {
  const mock = fakeAws();
  assert.deepEqual(runRollback(mock), []);
  assert.deepEqual(mock.calls.map((args) => args[1]), ["get-caller-identity", "describe-services"]);
});

test("failed edge rollout restores only edge and preserves a dormant standalone worker", () => {
  const state = services();
  state[0].taskDefinition = arn("edge", 67);
  state[0].desiredCount = 1;
  const mock = fakeAws({ state });
  assert.deepEqual(runRollback(mock), [configuration.edge]);
  assert.equal(updates(mock).length, 1);
  const update = updates(mock)[0];
  assert.equal(argument(update, "--task-definition"), arn("edge", 65));
  assert.equal(argument(update, "--desired-count"), "2");
  assert.equal(update.includes("--force-new-deployment"), false);
  assert.deepEqual(mock.calls.at(-1).slice(-1), [configuration.edge]);
});

test("a mistakenly activated worker is returned to zero without forcing or inspecting its missing image", () => {
  const state = services();
  state[1].desiredCount = 1;
  state[1].taskDefinition = arn("worker", 24);
  const mock = fakeAws({ state });
  assert.deepEqual(runRollback(mock), [configuration.worker]);
  const update = updates(mock)[0];
  assert.equal(argument(update, "--desired-count"), "0");
  assert.equal(argument(update, "--task-definition"), arn("worker", 23));
  assert.equal(update.includes("--force-new-deployment"), false);
  assert.equal(mock.calls.some((args) => args[1] === "describe-task-definition" || args[0] === "ecr"), false);
});

test("failure after worker retirement restores its original nonzero capacity", () => {
  const mock = fakeAws();
  runRollback(mock, { ...previous, PREVIOUS_WORKER_DESIRED_COUNT: "3" });
  assert.equal(updates(mock).length, 1);
  assert.equal(argument(updates(mock)[0], "--desired-count"), "3");
});

test("invalid or missing snapshot fields fail before any AWS call", () => {
  for (const [key, values] of [
    ["PREVIOUS_EDGE_DESIRED_COUNT", [undefined, "", "None", "-1", "1.5", "01", "NaN", "9007199254740992"]],
    ["PREVIOUS_WORKER_DESIRED_COUNT", [undefined, ""]],
    ["PREVIOUS_WORKER_TASK_DEFINITION", [undefined, "", "None", arn("worker", 23).replace(configuration.accountId, "000000000000")]]
  ]) {
    for (const value of values) {
      const mock = fakeAws();
      assert.throws(() => runRollback(mock, { ...previous, [key]: value }));
      assert.equal(mock.calls.length, 0);
    }
  }
  assert.equal(previousServices(previous, configuration)[1].desiredCount, 0);
});

test("wrong account prevents snapshot and rollback without service changes", () => {
  for (const action of [runRollback, (mock) => captureServiceState({ aws: mock.aws, configuration })]) {
    const mock = fakeAws({ account: "000000000000" });
    assert.throws(() => action(mock), /does not match/);
    assert.equal(mock.calls.length, 1);
  }
});

test("incomplete or inactive current service state never produces a snapshot or a partial rollback", () => {
  for (const options of [
    { state: services().slice(0, 1) },
    { state: services().map((entry) => ({ ...entry, status: "DRAINING" })) },
    { failures: [{ reason: "MISSING" }] },
    { state: services().map((entry) => ({ ...entry, desiredCount: null })) }
  ]) {
    const mock = fakeAws(options);
    assert.throws(() => currentServices(mock.aws, configuration));
    assert.throws(() => runRollback(mock));
    assert.equal(updates(mock).length, 0);
  }
});

test("one restore failure does not prevent the other service from being restored and waited for", () => {
  const state = services();
  state[0].desiredCount = 1;
  state[1].desiredCount = 1;
  const mock = fakeAws({ state, failUpdate: configuration.edge });
  assert.throws(() => runRollback(mock), /Could not restore.*edge/);
  assert.equal(updates(mock).length, 2);
  assert.deepEqual(mock.calls.at(-1).slice(-1), [configuration.worker]);
});

test("stability failure is reported rather than claiming rollback success", () => {
  const state = services();
  state[0].desiredCount = 1;
  const mock = fakeAws({ state, failWait: true });
  assert.throws(() => runRollback(mock), /did not stabilize/);
});

test("isolated recovery profile fails preflight before any mutation, detected by approval or command", () => {
  for (const container of [
    { environment: [{ name: "RECOVERY_WORKER_APPROVED", value: "production-cutover-20260913" }] },
    { command: ["node", "scripts/recovery-worker.mjs"] },
    { entryPoint: ["node", "/app/scripts/recovery-worker.mjs"] }
  ]) {
    const mock = fakeAws({ definition: { containerDefinitions: [container] } });
    assert.throws(() => captureServiceState({ aws: mock.aws, configuration }), /isolated recovery profile/);
    assert.equal(updates(mock).length, 0);
  }
});

test("unreadable current task definition fails closed before producing a deployment snapshot", () => {
  const mock = fakeAws({ definition: {} });
  assert.throws(() => captureServiceState({ aws: mock.aws, configuration }), /Cannot inspect/);
});

test("workflow guards rollback behind a service-changing step and wires original capacity", () => {
  const workflow = readFileSync(new URL("../.github/workflows/deploy-production.yml", import.meta.url), "utf8");
  assert.ok(workflow.indexOf("run: node scripts/capture-aws-service-state.mjs") < workflow.indexOf("uses: docker/build-push-action"));
  assert.ok(workflow.indexOf("run: node scripts/capture-aws-service-state.mjs") < workflow.indexOf("name: Run database migration"));
  assert.match(workflow, /- id: deploy_edge\n\s+name: Deploy public edge with worker/);
  const condition = workflow.match(/if: (failure\(\).*steps\.deploy_edge\.outcome.*)/)?.[1];
  assert.ok(condition);
  // Evaluate just this fixed workflow expression for each possible prior outcome.
  const shouldRollback = (previousOutcome, edgeOutcome) => Function("failure", "steps", `return ${condition}`)(
    () => true, { previous: { outcome: previousOutcome }, deploy_edge: { outcome: edgeOutcome } }
  );
  assert.equal(shouldRollback("success", "skipped"), false);
  assert.equal(shouldRollback("failure", "skipped"), false);
  assert.equal(shouldRollback("success", "success"), true);
  assert.equal(shouldRollback("success", "failure"), true);
  assert.match(workflow, /PREVIOUS_EDGE_DESIRED_COUNT: \$\{\{ steps\.previous\.outputs\.edge_desired_count \}\}/);
  assert.match(workflow, /PREVIOUS_WORKER_DESIRED_COUNT: \$\{\{ steps\.previous\.outputs\.worker_desired_count \}\}/);
});
