# Automatisches Deployment über GitHub Actions

Die Workflows prüfen bei jedem Pull Request und jedem Push nach `main`:

- Sicherheitswarnungen mit hoher oder kritischer Priorität
- Typecheck, Tests und Produktions-Build
- wöchentliche Dependency- und Action-Updates durch Dependabot

Ein Push nach `main` deployt nur nach der GitHub-Umgebungsfreigabe `production`.
Vor dem Update speichert der Workflow die beiden ECS-Task-Versionen und die
jeweilige gewünschte Task-Anzahl. Scheitert eine Migration vor dem Service-Update,
bleiben beide Services unverändert. Nach einem versuchten Edge-Deployment stellt
der Rollback nur tatsächlich geänderte Services mit ihrer vorherigen Anzahl
wieder her; ein zuvor deaktivierter Worker bleibt deaktiviert.

## Einmalig verbinden

1. Den Projektordner zu einem privaten GitHub-Repository pushen.
2. In AWS unter **IAM → Identity providers** `token.actions.githubusercontent.com` als OpenID-Connect-Anbieter anlegen (Audience: `sts.amazonaws.com`), falls noch nicht vorhanden.
3. Eine IAM-Rolle `ai-sports-prediction-github-deploy` mit der Trust-Policy aus [github-actions-oidc-trust-policy.template.json](../infra/iam/github-actions-oidc-trust-policy.template.json) anlegen. Die Vorlage ist bereits exakt auf `jonas-srd/ai_sports_prediction` und die geschützte Umgebung `production` beschränkt.
4. Die Berechtigung aus [github-actions-deployment-policy.json](../infra/iam/github-actions-deployment-policy.json) an diese Rolle hängen.
5. In GitHub unter **Settings → Environments → production** mindestens eine Freigabe durch euch aktivieren.
6. In GitHub unter **Settings → Secrets and variables → Actions** das Secret `AWS_GITHUB_DEPLOY_ROLE_ARN` mit der ARN dieser Rolle speichern.
7. Die Produktionsvorgaben sind Konto `186581960948`, Region `eu-central-1`,
   `LLM_PROVIDER=bedrock` und `BEDROCK_MODEL_ID=eu.amazon.nova-2-lite-v1:0`.
   Die gleichnamigen Variablen der Umgebung `production` können diese Vorgaben
   überschreiben. Für eine Rückkehr zu OpenRouter `LLM_PROVIDER=openrouter` setzen.

Es werden keine AWS-Zugangsschlüssel in GitHub gespeichert. GitHub erhält für jeden Deployment-Lauf nur eine kurzlebige, auf dieses Repository beschränkte AWS-Sitzung.

## Recovery-Preflight und zusätzliche Leseberechtigung

Der Preflight liest die aktuelle Edge-Task-Definition, um das isolierte
Recovery-Profil zu erkennen. Fehlt der Deployment-Rolle
`ecs:DescribeTaskDefinition`, bricht er mit
`PREFLIGHT_TASK_DEFINITION_READ_DENIED` vor Image-Veröffentlichung, Migration und
Service-Update ab. Der Schutz wird bei fehlender Leseberechtigung nicht übersprungen.

Die Policy-Vorlage enthält dafür das separate Statement
`ReadTaskDefinitionsForRecoveryPreflight`: ausschließlich
`ecs:DescribeTaskDefinition`, eingeschränkt auf Anfragen in `eu-central-1`.
AWS unterstützt für diese Aktion keine ressourcenbezogene Einschränkung auf
eine einzelne Task-Familie; deshalb ist `Resource: "*"` erforderlich. Das
Statement erlaubt der Rolle, Task-Definition-Metadaten im Konto und in dieser
Region zu lesen, nicht nur diejenigen der Projektfamilie. Es erteilt keine neuen
Schreibrechte und keinen direkten Zugriff auf Secrets-Manager-/SSM-Geheimwerte.
Siehe die [offizielle AWS-Autorisierungstabelle für ECS](https://docs.aws.amazon.com/es_es/service-authorization/latest/reference/list_amazonelasticcontainerservice.html),
Zeile `DescribeTaskDefinition` ohne unterstützten Ressourcentyp.

**Diese Änderung ist nur in der lokalen Policy-Vorlage vorbereitet und wurde
nicht auf die IAM-Rolle in AWS angewendet.** Ein berechtigter Administrator muss
die Leseberechtigung separat prüfen und übernehmen. Ein Commit oder Push der
Vorlage ändert keine IAM-Berechtigung.

Auch nach Erteilung der Leseberechtigung bleibt ein normales Deployment bewusst
gesperrt, solange die Edge-Task-Definition `RECOVERY_WORKER_APPROVED` oder den
Befehl `recovery-worker.mjs` enthält: Das Recovery-Profil verzichtet auf reguläre
Business-Handler und deren Zugangsdaten. Eine Rückkehr zum vollständigen Service
benötigt einen separat geprüften Rollout und ist kein Preflight-Bypass.
