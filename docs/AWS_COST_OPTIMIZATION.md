# AWS cost optimization

This project keeps the public site, API, prediction and odds automation,
outreach jobs, verified backups, retries, and the managed Redis queue intact.
The cost reduction is based on measured production utilization rather than on
removing features.

## Implemented in the deployment configuration

- The queue worker runs as an independently restarted sidecar container in the
  existing edge task. A worker restart does not take the public site down.
  After the consolidated task and public health check succeed, the deployment
  scales the old standalone worker service to zero.
- Rollback explicitly restores both the previous edge task and one standalone
  worker task.
- The production image uses a multi-stage build. Compilers, package caches, and
  development dependencies are excluded from the runtime image.
- Runtime secrets can be read from free standard SSM SecureString parameters.
  Deployment falls back to the existing Secrets Manager entries until the
  migration has been completed.
- The ECR lifecycle policy retains the 20 newest image objects and expires older
  objects. This leaves multiple rollback releases available.
- Operations configuration selects RDS gp3 storage and private VPC access while
  preserving deletion protection and automated backups.

## Safe production rollout order

1. Grant the deployment user the scoped policy in
   `infra/iam/cost-optimization-policy.json`.
2. Attach `infra/iam/ecs-execution-runtime-parameters-policy.json` as an inline
   policy to `ai-sports-prediction-ecs-execution-role`.
3. Synchronize the existing secret values with
   `npm run aws:migrate-runtime-secrets`. The command never prints secret
   values.
4. Preview and then apply `infra/ecr-lifecycle-policy.json` to the ECR
   repository. Confirm that the task-definition images currently used by the
   edge and worker are not expiration candidates.
5. Deploy the new immutable image. The workflow verifies the consolidated edge
   service before it scales the standalone worker to zero.
6. Confirm the public health endpoint, all four edge containers, the fixture
   heartbeat, prediction and odds jobs, and a verified backup.
7. Run `npm run aws:configure-operations` to move RDS from gp2 to gp3 and remove
   its public IPv4 address. ECS and RDS already use the same VPC and subnets.
8. After at least one full automation and backup cycle, schedule the old Secrets
   Manager entries for recoverable deletion. The unused
   `admin-login-code-pepper` entry can also be retired after confirming it has no
   external consumer.

## Rollback

If edge verification fails, the workflow keeps the standalone worker running
and restores the previous task definitions. If a post-deployment check fails,
run `npm run aws:rollback`; the rollback script restores desired count one for
both services.

Do not delete the ElastiCache queue as part of this rollout. Replacing a durable
queue with an in-process cache would reduce resilience and would therefore be a
functional regression.

## Expected recurring reduction

At the measured Frankfurt rates and current sizes, retiring the standalone ARM
worker and one public IPv4 address saves about USD 20 per month. Migrating the 14
active runtime values to standard Parameter Store and retiring the orphaned
secret saves about USD 6 per month. Private RDS networking saves about USD 3.65
per month. The ECR lifecycle and smaller runtime image reduce the remaining
registry storage charge.

The result is approximately USD 30-33 less recurring spend per month before
taxes, data transfer, credits, or commitment discounts. A Compute Savings Plan
and an RDS Reserved Instance can reduce the stable remainder further, but those
are financial commitments and should only be purchased after Cost Explorer and
the account's remaining Free Tier credits are visible.
