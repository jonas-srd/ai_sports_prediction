#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const region = process.env.AWS_REGION ?? "eu-central-1";
const accountId = aws(["sts", "get-caller-identity", "--query", "Account", "--output", "text"]);
const logGroup = process.env.ECS_LOG_GROUP ?? "/ecs/ai-sports-prediction";
const namespace = "AI-Sports-Prediction/Operations";
const topicArn = aws([
  "sns", "create-topic",
  "--name", "ai-sports-prediction-ops-alerts",
  "--query", "TopicArn",
  "--output", "text"
]);

const existingSubscriptions = JSON.parse(aws([
  "sns", "list-subscriptions-by-topic",
  "--topic-arn", topicArn,
  "--output", "json"
])).Subscriptions ?? [];
for (const email of (process.env.OPS_ALERT_EMAILS ?? "schroeder.jonas@hotmail.de,jonas.schweisthal@gmail.com")
  .split(",").map((value) => value.trim()).filter(Boolean)) {
  if (!existingSubscriptions.some((subscription) => subscription.Endpoint === email)) {
    aws(["sns", "subscribe", "--topic-arn", topicArn, "--protocol", "email", "--notification-endpoint", email]);
  }
}

aws(["logs", "put-retention-policy", "--log-group-name", logGroup, "--retention-in-days", "30"]);
putMetricFilter("ai-sports-job-errors", "?ERROR ?Error ?failed ?Failed ?Unhandled", "JobErrors");
putMetricFilter("ai-sports-worker-heartbeat", "\"Fixture synchronization finished\"", "WorkerHeartbeat");
putMetricFilter("ai-sports-backup-success", "\"Wrote verified Postgres logical export\"", "BackupSuccess");

putAlarm({
  name: "ai-sports-job-errors",
  metricName: "JobErrors",
  comparison: "GreaterThanOrEqualToThreshold",
  threshold: "1",
  period: "300",
  evaluationPeriods: "1",
  datapointsToAlarm: "1",
  treatMissingData: "notBreaching"
});
putAlarm({
  name: "ai-sports-worker-heartbeat-missing",
  metricName: "WorkerHeartbeat",
  comparison: "LessThanThreshold",
  threshold: "1",
  period: "1800",
  evaluationPeriods: "1",
  datapointsToAlarm: "1",
  treatMissingData: "breaching"
});
putAlarm({
  name: "ai-sports-daily-backup-missing",
  metricName: "BackupSuccess",
  comparison: "LessThanThreshold",
  threshold: "1",
  period: "3600",
  evaluationPeriods: "26",
  datapointsToAlarm: "26",
  treatMissingData: "breaching"
});

aws([
  "s3api", "put-bucket-lifecycle-configuration",
  "--bucket", "ai-sports-prediction",
  "--lifecycle-configuration", JSON.stringify({
    Rules: [{
      ID: "verified-logical-backup-retention",
      Status: "Enabled",
      Filter: { Prefix: "ai-sports-prediction/backups/" },
      Expiration: { Days: 35 },
      AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 }
    }]
  })
]);

const databases = JSON.parse(aws([
  "rds", "describe-db-instances",
  "--query", "DBInstances[?DBInstanceIdentifier=='ai-sports-prediction-db']",
  "--output", "json"
]));
if (databases.length) {
  aws([
    "rds", "modify-db-instance",
    "--db-instance-identifier", "ai-sports-prediction-db",
    "--backup-retention-period", process.env.RDS_BACKUP_RETENTION_DAYS ?? "1",
    "--deletion-protection",
    "--apply-immediately",
    "--output", "text"
  ]);
}

console.log(`Operations alerts topic: ${topicArn}`);
console.log(`Operations namespace: ${namespace}`);
console.log(`Account: ${accountId}`);

function putMetricFilter(name, pattern, metricName) {
  aws([
    "logs", "put-metric-filter",
    "--log-group-name", logGroup,
    "--filter-name", name,
    "--filter-pattern", pattern,
    "--metric-transformations",
    `metricName=${metricName},metricNamespace=${namespace},metricValue=1,defaultValue=0`
  ]);
}

function putAlarm(input) {
  aws([
    "cloudwatch", "put-metric-alarm",
    "--alarm-name", input.name,
    "--namespace", namespace,
    "--metric-name", input.metricName,
    "--statistic", "Sum",
    "--comparison-operator", input.comparison,
    "--threshold", input.threshold,
    "--period", input.period,
    "--evaluation-periods", input.evaluationPeriods,
    "--datapoints-to-alarm", input.datapointsToAlarm,
    "--treat-missing-data", input.treatMissingData,
    "--alarm-actions", topicArn,
    "--ok-actions", topicArn
  ]);
}

function aws(args) {
  return execFileSync("aws", [
    "--region", region,
    "--cli-connect-timeout", "5",
    "--cli-read-timeout", "60",
    ...args
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
