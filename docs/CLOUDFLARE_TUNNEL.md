# Cloudflare Tunnel Deployment

This is the current low-cost public edge for AI Sport Prediction:

- Cloudflare terminates the public HTTPS connection.
- `cloudflared` connects outbound from ECS to Cloudflare.
- Web and API run inside the same ECS Fargate task as the tunnel connector.
- The ECS application security group does not need public inbound rules.

This avoids an Application Load Balancer for the first production phase. Add an
ALB later if you need AWS-native health checks, weighted routing, or larger
multi-service routing.

## 1. Create the Tunnel in Cloudflare

In Cloudflare Zero Trust:

```text
Networks -> Tunnels -> Create tunnel -> Cloudflared
```

Use:

```text
Tunnel name: ai-sports-prediction
Environment: Docker
```

Copy the generated tunnel token. Do not commit it.

Cloudflare's dashboard-managed tunnel flow creates the tunnel and lets a
connector authenticate with a token. `cloudflared` supports `TUNNEL_TOKEN` as
the environment variable for `cloudflared tunnel run --token <TUNNEL_TOKEN>`.

Sources:

- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/
- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/

## 2. Store the Tunnel Token in AWS

Create the secret:

```bash
aws secretsmanager create-secret \
  --region eu-central-1 \
  --name ai-sports-prediction/cloudflare-tunnel-token \
  --secret-string '<cloudflare-tunnel-token>'
```

If the secret already exists, update it:

```bash
aws secretsmanager put-secret-value \
  --region eu-central-1 \
  --secret-id ai-sports-prediction/cloudflare-tunnel-token \
  --secret-string '<cloudflare-tunnel-token>'
```

The ECS execution role must be allowed to read this secret, together with:

```text
ai-sports-prediction/database-url
ai-sports-prediction/redis-url
ai-sports-prediction/admin-api-token
ai-sports-prediction/resend-api-key
```

## 3. Configure Public Hostnames

In the Cloudflare tunnel settings, add public hostnames:

```text
www.ai-sports-prediction.net  -> HTTP -> http://127.0.0.1:3000
api.ai-sports-prediction.net  -> HTTP -> http://127.0.0.1:3001
```

Do not expose admin backup endpoints as a public hostname.

If the root domain has imported IONOS `A` or `AAAA` records for `@`, delete
those records after the tunnel route exists. The root domain should resolve
through the tunnel route, not the old parking/default host.

## 4. Cloudflare Cache Rules

Use conservative edge caching for public, read-only traffic only:

```text
Rules -> Cache Rules -> Create rule
```

Website HTML:

```text
Name: Cache public website pages
When incoming requests match:
  Hostname equals www.ai-sports-prediction.net
  URI Path does not start with /api/
Then:
  Eligible for cache: true
  Edge TTL: respect origin header
```

Public API reads:

```text
Name: Cache public API reads
When incoming requests match:
  Hostname equals api.ai-sports-prediction.net
  URI Path starts with /v1/
Then:
  Eligible for cache: true
  Edge TTL: respect origin header
```

Do not cache `/health` or `/v1/admin/*`. The API already sends short
`Cache-Control` headers and uses Redis, so Cloudflare should respect origin
headers instead of forcing a long TTL.

## 5. Deploy the ECS Edge Service

Make sure the latest app image is already pushed to ECR, then run:

```bash
npm run aws:deploy-cloudflare-edge
```

The script uses these defaults:

```text
AWS_REGION=eu-central-1
ECS_CLUSTER=ai-sports-prediction
ECS_EDGE_SERVICE=ai-sports-prediction-edge
ECS_EDGE_TASK_FAMILY=ai-sports-prediction-edge
ECS_APP_SECURITY_GROUP=sg-0ff92d788326fd9ac
ECS_SUBNET_IDS=subnet-0cc8d0aa15263d1ef,subnet-06ed8c8d5be7ac04c,subnet-0f5eb9f5765d627ee
ECS_ASSIGN_PUBLIC_IP=ENABLED
ECS_EDGE_CPU=1024
ECS_EDGE_MEMORY=2048
```

Override them with environment variables if the AWS resources change.

The edge task contains three containers:

```text
web          SERVICE_ROLE=web, listens on 3000
api          SERVICE_ROLE=api, listens on 3001, uses Postgres and Redis cache
cloudflared  connects the Cloudflare Tunnel using TUNNEL_TOKEN
```

The API container uses the AWS RDS global certificate bundle at:

```text
/etc/ssl/certs/aws-rds-global-bundle.pem
```

## 6. Verify

Check the ECS service:

```bash
aws ecs describe-services \
  --region eu-central-1 \
  --cluster ai-sports-prediction \
  --services ai-sports-prediction-edge \
  --query 'services[0].{status:status,desired:desiredCount,running:runningCount}'
```

Check Cloudflare Zero Trust:

```text
Networks -> Tunnels -> ai-sports-prediction -> Status: Healthy
```

Check the app:

```bash
curl -I https://www.ai-sports-prediction.net
curl -I https://api.ai-sports-prediction.net/health
```

For cache verification:

```bash
npm run load:test -- --url https://api.ai-sports-prediction.net/v1/matches --requests 100 --concurrency 10
```

Expected after warmup:

```text
x-api-cache:HIT
cf-cache-status:HIT
```

## 7. Scaling Notes

For the beta phase:

```text
ECS_DESIRED_COUNT=1
```

For better availability:

```text
ECS_DESIRED_COUNT=2
```

Both tasks run their own `cloudflared` connector for the same tunnel. Keep the
API cache enabled so most public read traffic hits Redis instead of Postgres.
