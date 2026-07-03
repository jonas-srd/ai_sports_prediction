# AWS ECS Fargate Deployment

Production target for AI Sports Prediction:

- RDS PostgreSQL as source of truth
- ElastiCache Valkey/Redis OSS as BullMQ queue backend
- S3 as verified logical backup storage
- ECS Fargate for separate web, API, worker, migration, and backup tasks
- Secrets Manager for database URLs and API keys

## 1. Networking

Use `eu-central-1`.

Create security groups:

```text
ai-sports-prediction-alb
  inbound  80/443 from 0.0.0.0/0
  outbound all

ai-sports-prediction-app
  inbound  web/api ports from ai-sports-prediction-alb only
  outbound all

ai-sports-prediction-db-access
  inbound  5432 from ai-sports-prediction-app
  inbound  5432 from your IP for temporary local maintenance

ai-sports-prediction-redis-access
  inbound  6379 from ai-sports-prediction-app
```

The worker service does not need inbound traffic.

## 2. Redis Queue

Create an ElastiCache serverless cache:

```text
Name: ai-sports-prediction-queue
Engine: Valkey or Redis OSS
Region: eu-central-1
VPC: same VPC as RDS and ECS
Security group: ai-sports-prediction-redis-access
```

After creation, set:

```text
REDIS_URL=rediss://<elasticache-endpoint>:6379
```

Use `rediss://` when TLS is enabled.

## 3. Secrets

Create Secrets Manager entries:

```text
ai-sports-prediction/database-url
ai-sports-prediction/redis-url
ai-sports-prediction/openrouter-api-key
ai-sports-prediction/football-data-api-key
ai-sports-prediction/admin-api-token
```

For ECS, prefer IAM task roles over static AWS access keys. The ECS task role
should be allowed to write only to:

```text
arn:aws:s3:::ai-sports-prediction/ai-sports-prediction/backups/*
```

## 4. Container Image

Build one Docker image and run it with different `SERVICE_ROLE` values:

```text
SERVICE_ROLE=web
SERVICE_ROLE=api
SERVICE_ROLE=worker
SERVICE_ROLE=migrate
SERVICE_ROLE=backup
```

Push the image to ECR:

```bash
aws ecr create-repository --repository-name ai-sports-prediction --region eu-central-1
aws ecr get-login-password --region eu-central-1 \
  | docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-central-1.amazonaws.com
docker build -t ai-sports-prediction .
docker tag ai-sports-prediction:latest <account-id>.dkr.ecr.eu-central-1.amazonaws.com/ai-sports-prediction:latest
docker push <account-id>.dkr.ecr.eu-central-1.amazonaws.com/ai-sports-prediction:latest
```

## 5. ECS Services

Create an ECS cluster:

```text
Name: ai-sports-prediction
Launch type: Fargate
```

Create task definitions from the same image:

```text
web
  SERVICE_ROLE=web
  PORT=3000
  public behind Application Load Balancer

api
  SERVICE_ROLE=api
  API_PORT=3001
  public or private behind Application Load Balancer

worker
  SERVICE_ROLE=worker
  no load balancer
```

Run migrations as a one-off ECS task before the first release and after schema
changes:

```text
SERVICE_ROLE=migrate
```

Run scheduled backups with EventBridge Scheduler:

```text
SERVICE_ROLE=backup
Schedule: daily
```

## 6. Required Runtime Variables

Web:

```text
SERVICE_ROLE=web
AI_SPORTS_API_URL=https://<api-domain>
INTERNAL_API_URL=https://<api-domain>
```

API:

```text
SERVICE_ROLE=api
API_PORT=3001
DATABASE_URL=<secret>
REDIS_URL=<secret>
DATABASE_SSL=1
DATABASE_SSL_REJECT_UNAUTHORIZED=1
API_CORS_ORIGIN=https://<web-domain>
ADMIN_API_TOKEN=<secret>
API_CACHE_ENABLED=1
API_CACHE_MATCHES_TTL_SECONDS=300
API_CACHE_BENCHMARK_TTL_SECONDS=300
API_CACHE_SPECIAL_TTL_SECONDS=300
API_CACHE_HEALTH_TTL_SECONDS=2
```

Worker:

```text
SERVICE_ROLE=worker
DATABASE_URL=<secret>
REDIS_URL=<secret>
OPENROUTER_API_KEY=<secret>
FOOTBALL_DATA_API_KEY=<secret>
BACKUP_S3_BUCKET=ai-sports-prediction
BACKUP_S3_REGION=eu-central-1
BACKUP_S3_PREFIX=ai-sports-prediction/backups
```

Backup task:

```text
SERVICE_ROLE=backup
DATABASE_URL=<secret>
BACKUP_S3_BUCKET=ai-sports-prediction
BACKUP_S3_REGION=eu-central-1
BACKUP_S3_PREFIX=ai-sports-prediction/backups
```

## 7. Release Order

1. Create/update secrets.
2. Push image to ECR.
3. Run `SERVICE_ROLE=migrate` one-off task.
4. Start/update API service.
5. Start/update worker service.
6. Start/update web service.
7. Run one `SERVICE_ROLE=backup` one-off task and verify the S3 object plus
   `backup_artifacts` row.

## 8. Current Local Notes

Local `.env` is ignored by Git. Production containers do not require `.env`; the
root npm scripts load it only when the file exists.
