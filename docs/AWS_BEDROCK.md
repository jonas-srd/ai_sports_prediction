# Amazon Bedrock

The prediction worker can use Amazon Bedrock through the AWS SDK credential
provider chain. In ECS, credentials come from the existing task role; do not add
long-lived AWS access keys to environment variables or Secrets Manager.

## Active production deployment

Activated on 2026-09-13 in the existing account `186581960948`:

- Region: `eu-central-1`.
- Provider: `bedrock`.
- Model: `eu.amazon.nova-2-lite-v1:0` (EU inference profile).
- Service: `ai-sports-prediction-edge`, task definition revision `65`.
- Task role: `ai-sports-prediction-ecs-task-role`.
- Image tag: `bedrock-20260913-9f82a9d-r2`.
- Image digest: `sha256:b55b67cfd867e7cb4800648d03eab734e6ae817aa90ae26df01e6779bb07a6cb`.

The rollout copied the active task definition and changed only the application
images and the worker's Bedrock environment settings. Existing configuration,
secret references, networking, and desired counts were preserved. Web, API,
worker, and tunnel share the existing ECS task role.

A real ECS invocation using that task role successfully returned all three
prediction profiles (`nexus`, `pulse`, `edge`). The final ARM64 image passed the
test suite and dependency audit. The previous task definition, revision `64`,
remains available for rollback:

```bash
aws ecs update-service --region eu-central-1 \
  --cluster ai-sports-prediction --service ai-sports-prediction-edge \
  --task-definition ai-sports-prediction-edge:64
```

The production workflow now defaults to this account, Region, and Bedrock
model. The shared client still defaults to OpenRouter outside production when
`LLM_PROVIDER` is unset.

### End-to-end verification blocker

The ECS rollout completed with one running task and the public web health
endpoint returned `ok: true`. An independent local verification passed all
145 tests, the workspace typecheck, and a fresh lockfile audit (zero known
vulnerabilities).

The separate one-fixture pipeline check did **not** pass: it exited before
model invocation while connecting to PostgreSQL (`ETIMEDOUT` on port `5432`).
RDS reported `ai-sports-prediction-db` in the terminal
`inaccessible-encryption-credentials` state. The referenced AWS-managed KMS key
was `Enabled` at inspection time. A subsequent read-only console inspection
confirmed transition to the terminal state on 2026-09-02, before this rollout;
the original cause of lost key access remains unverified.
RDS reported `LatestRestorableTime` as `2026-08-26T06:48:39Z`, but this metadata
alone does not establish that a usable backup is available. The deployment
identity cannot read RDS events or snapshot listings through the CLI. The
existing browser session could read both: four available snapshots and an
automated recovery window were found. The separate
[recovery plan](AWS_RDS_RECOVERY_PLAN_2026-09-13.md) records exact sources,
verification gates, costs, and approval boundaries. A subsequently approved
isolated PITR restore to `2026-08-26T06:48:39Z` succeeded; see the
[recovery results](AWS_RDS_RECOVERY_RESULT_2026-09-13.md). The private test
database passed TLS/read/schema checks, persistence and readback of three
synthetic Bedrock predictions, and a fresh S3 backup/download/checksum/temporary
table restore drill. This is not a production cutover or a full foreign-key /
trigger semantic validation.

[AWS documents this RDS state as requiring restoration from a backup](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html).
No database, KMS key, database secret, or database network settings were changed
during the initial Bedrock rollout. The separately approved recovery created
only an isolated test database; the production database secret and ECS service
remain unchanged. Bedrock invocation and isolated persistence are verified;
persistence of real production predictions remains blocked until a separately
approved and validated cutover. Rolling back the
application image does not repair this RDS state.

## Runtime configuration

Set these variables for a Bedrock deployment:

```text
LLM_PROVIDER=bedrock
AWS_ACCOUNT_ID=<12-digit-target-account-id>
AWS_REGION=eu-central-1
BEDROCK_MODEL_ID=<foundation-model-id, inference-profile-id, or ARN>
```

`BEDROCK_MODEL_ID` deliberately has no production default. Select a model or
inference profile that is available from `AWS_REGION`. OpenRouter remains the
default when `LLM_PROVIDER` is unset.

For local development, the AWS SDK uses the standard AWS credential chain. An
AWS profile or an IAM Identity Center session is preferable to access keys in
`.env`.

## Least-privilege task-role policy

The application uses non-streaming Bedrock inference, so the task role needs
only `bedrock:InvokeModel`. It does not need `bedrock:*` or
`bedrock:InvokeModelWithResponseStream`.

After choosing `BEDROCK_MODEL_ID`, configure the existing ECS task role:

```bash
export LLM_PROVIDER=bedrock
export AWS_ACCOUNT_ID='<12-digit-target-account-id>'
export AWS_REGION=eu-central-1
export BEDROCK_MODEL_ID='<selected-model-or-profile>'
npm run aws:configure-bedrock
```

The command resolves the selected resource before writing the inline policy:

- a foundation-model ID or ARN grants `bedrock:InvokeModel` on that exact model;
- an inference-profile ID or ARN grants invocation on that exact profile and
  its reported destination model ARNs;
- destination-model access is conditioned on use of that inference profile.

`AWS_ACCOUNT_ID` is mandatory for this IAM-changing command and must match the
account reported by the active AWS credentials. A mismatch stops the command
before it can modify a role.

Explicit ARNs must match the configured partition, Region, and account and may
not contain wildcards.

Use `BEDROCK_IAM_DRY_RUN=1` to print the resolved policy without changing IAM.
Set `ECS_TASK_ROLE_NAME` when the role is not named
`ai-sports-prediction-ecs-task-role`. The identity running the setup command
needs `sts:GetCallerIdentity`, `bedrock:GetInferenceProfile` for a profile (or
`bedrock:GetFoundationModel` for a direct model), and `iam:PutRolePolicy` for
only that ECS task role. These Bedrock read actions are setup permissions; the
ECS runtime role itself still needs only `bedrock:InvokeModel`.

For a direct foundation model, `infra/iam/bedrock-invoke-model-policy.template.json`
also documents the minimal policy shape. AWS documents the `models` response
from `GetInferenceProfile` as the model ARNs for the profile's destination
Regions. Prefer the setup command so every required ARN stays exact without a
hard-coded Region list.

## Deploy

The ECS deployment scripts pass `LLM_PROVIDER`, the deployment `AWS_REGION`, and
`BEDROCK_MODEL_ID` to the worker container:

```bash
npm run aws:deploy-cloudflare-edge
# or, for the standalone worker service
npm run aws:deploy-worker
```

Before deploying, verify the selected model is available to the account in the
configured Region. Model invocation is usage-billed; add AWS Budgets or
CloudWatch billing alarms appropriate to the expected prediction volume.

AWS references:

- [Making inference requests](https://docs.aws.amazon.com/bedrock/latest/userguide/inference.html)
- [Converse API authorization](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html)
- [Inference profile IAM requirements](https://docs.aws.amazon.com/bedrock/latest/userguide/geographic-cross-region-inference.html)
- [Inference profile destinations](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html)
