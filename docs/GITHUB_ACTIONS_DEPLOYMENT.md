# Automatisches Deployment über GitHub Actions

Die Workflows prüfen bei jedem Pull Request und jedem Push nach `main`:

- Sicherheitswarnungen mit hoher oder kritischer Priorität
- Typecheck, Tests und Produktions-Build
- wöchentliche Dependency- und Action-Updates durch Dependabot

Ein Push nach `main` deployt nur nach der GitHub-Umgebungsfreigabe `production`.
Vor dem Update speichert der Workflow die beiden aktiven ECS-Task-Versionen. Falls Migration, Service-Start oder der öffentliche Health-Check fehlschlagen, setzt er Edge und Worker automatisch auf diese Versionen zurück.

## Einmalig verbinden

1. Den Projektordner zu einem privaten GitHub-Repository pushen.
2. In AWS unter **IAM → Identity providers** `token.actions.githubusercontent.com` als OpenID-Connect-Anbieter anlegen (Audience: `sts.amazonaws.com`), falls noch nicht vorhanden.
3. Eine IAM-Rolle `ai-sports-prediction-github-deploy` mit der Trust-Policy aus [github-actions-oidc-trust-policy.template.json](../infra/iam/github-actions-oidc-trust-policy.template.json) anlegen. Die Vorlage ist bereits exakt auf `jonas-srd/ai_sports_prediction` und die geschützte Umgebung `production` beschränkt.
4. Die Berechtigung aus [github-actions-deployment-policy.json](../infra/iam/github-actions-deployment-policy.json) an diese Rolle hängen.
5. In GitHub unter **Settings → Environments → production** mindestens eine Freigabe durch euch aktivieren.
6. In GitHub unter **Settings → Secrets and variables → Actions** das Secret `AWS_GITHUB_DEPLOY_ROLE_ARN` mit der ARN dieser Rolle speichern.

Es werden keine AWS-Zugangsschlüssel in GitHub gespeichert. GitHub erhält für jeden Deployment-Lauf nur eine kurzlebige, auf dieses Repository beschränkte AWS-Sitzung.
