#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const region = env("AWS_REGION", "eu-central-1");
const modelId = requiredEnv("BEDROCK_MODEL_ID");
const expectedAccountId = requiredAwsAccountId();
const identity = awsJson(["sts", "get-caller-identity", "--output", "json"]);
const accountId = identity.Account;
if (accountId !== expectedAccountId) {
  throw new Error(`AWS credential account ${accountId} does not match AWS_ACCOUNT_ID=${expectedAccountId}; refusing to modify IAM.`);
}
const partition = parseArn(identity.Arn).partition;
const taskRoleName = getTaskRoleName();
const policyName = env("BEDROCK_IAM_POLICY_NAME", "ai-sports-prediction-bedrock-invoke");
const policy = resolveInvokePolicy(modelId);

if (env("BEDROCK_IAM_DRY_RUN", "0") === "1") {
  console.log(JSON.stringify(policy, null, 2));
  process.exit(0);
}

aws([
  "iam", "put-role-policy",
  "--role-name", taskRoleName,
  "--policy-name", policyName,
  "--policy-document", JSON.stringify(policy)
]);

console.log(`Configured ${policyName} on ${taskRoleName}.`);
console.log(`Bedrock Region: ${region}`);
console.log(`Bedrock model or inference profile: ${modelId}`);

function resolveInvokePolicy(identifier) {
  if (identifier.startsWith("arn:")) {
    const arn = parseArn(identifier);
    if (isExactFoundationModelArn(arn)) return directModelPolicy(identifier);
    if (isExactInferenceProfileArn(arn)) return inferenceProfilePolicy(readInferenceProfile(identifier));
    throw new Error("BEDROCK_MODEL_ID ARN must identify one exact model/profile in the configured Region and account; wildcards are not allowed.");
  }

  const profile = tryAwsJson([
    "bedrock", "get-inference-profile",
    "--inference-profile-identifier", identifier,
    "--output", "json"
  ]);
  if (profile) {
    return inferenceProfilePolicy(profile);
  }

  const foundationModel = tryAwsJson([
    "bedrock", "get-foundation-model",
    "--model-identifier", identifier,
    "--output", "json"
  ]);
  const modelArn = foundationModel?.modelDetails?.modelArn;
  if (typeof modelArn === "string" && modelArn) {
    return directModelPolicy(modelArn);
  }

  throw new Error(
    `BEDROCK_MODEL_ID=${identifier} was not found as a foundation model or inference profile in ${region}.`
  );
}

function directModelPolicy(modelArn) {
  return {
    Version: "2012-10-17",
    Statement: [{
      Sid: "InvokeConfiguredBedrockModel",
      Effect: "Allow",
      Action: "bedrock:InvokeModel",
      Resource: modelArn
    }]
  };
}

function inferenceProfilePolicy(profile) {
  const profileArn = profile?.inferenceProfileArn;
  const modelArns = [...new Set(
    (profile?.models ?? [])
      .map((model) => model?.modelArn)
      .filter((modelArn) => typeof modelArn === "string" && modelArn)
  )];

  if (typeof profileArn !== "string" || !profileArn || modelArns.length === 0) {
    throw new Error("Amazon Bedrock returned an incomplete inference profile response.");
  }

  if ((profile.inferenceProfileId ?? modelId).startsWith("global.")) {
    for (const modelArn of [...modelArns]) {
      const resourceId = modelArn.split("/", 2)[1];
      if (resourceId) modelArns.push(`arn:${partition}:bedrock:::foundation-model/${resourceId}`);
    }
  }

  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "InvokeConfiguredBedrockInferenceProfile",
        Effect: "Allow",
        Action: "bedrock:InvokeModel",
        Resource: profileArn
      },
      {
        Sid: "InvokeOnlyModelsBehindConfiguredProfile",
        Effect: "Allow",
        Action: "bedrock:InvokeModel",
        Resource: [...new Set(modelArns)],
        Condition: {
          StringEquals: {
            "bedrock:InferenceProfileArn": profileArn
          }
        }
      }
    ]
  };
}

function readInferenceProfile(identifier) {
  return awsJson([
    "bedrock", "get-inference-profile",
    "--inference-profile-identifier", identifier,
    "--output", "json"
  ]);
}

function getTaskRoleName() {
  const configuredName = process.env.ECS_TASK_ROLE_NAME?.trim();
  if (configuredName) return configuredName;

  const configuredArn = process.env.ECS_TASK_ROLE_ARN?.trim();
  if (!configuredArn) return "ai-sports-prediction-ecs-task-role";

  const marker = ":role/";
  const markerIndex = configuredArn.indexOf(marker);
  if (markerIndex === -1) throw new Error("ECS_TASK_ROLE_ARN is not an IAM role ARN.");
  return configuredArn.slice(markerIndex + marker.length).split("/").at(-1);
}

function isExactFoundationModelArn(arn) {
  return arn.partition === partition
    && arn.service === "bedrock"
    && arn.region === region
    && arn.account === ""
    && /^foundation-model\/[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(arn.resource);
}

function isExactInferenceProfileArn(arn) {
  return arn.partition === partition
    && arn.service === "bedrock"
    && arn.region === region
    && arn.account === accountId
    && /^(application-)?inference-profile\/[A-Za-z0-9][A-Za-z0-9:._-]*$/u.test(arn.resource);
}

function parseArn(value) {
  const match = /^arn:([^:]+):([^:]+):([^:]*):([^:]*):(.+)$/u.exec(value ?? "");
  if (!match) throw new Error("Unable to determine the AWS partition from the caller identity ARN.");
  return {
    partition: match[1],
    service: match[2],
    region: match[3],
    account: match[4],
    resource: match[5]
  };
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function requiredAwsAccountId() {
  const value = requiredEnv("AWS_ACCOUNT_ID");
  if (!/^[0-9]{12}$/u.test(value)) throw new Error("AWS_ACCOUNT_ID must be a 12-digit AWS account ID.");
  return value;
}

function env(name, fallback) {
  return process.env[name] ?? fallback;
}

function tryAwsJson(args) {
  try {
    return awsJson(args);
  } catch {
    return null;
  }
}

function awsJson(args) {
  return JSON.parse(aws(args));
}

function aws(args) {
  return execFileSync("aws", [
    "--region", region,
    "--cli-connect-timeout", "5",
    "--cli-read-timeout", "60",
    ...args
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
