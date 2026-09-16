# Produktionsumschaltung auf die wiederhergestellte RDS-Instanz

Nachtrag 16.09.2026, 20:47 UTC: **Umschaltung nach ausdrücklicher Unterbrechungsfreigabe abgeschlossen.** Secret-Version 2 verweist auf die Recovery-Datenbank; genau ein Task der eingeschränkten Revision 66 läuft. Website/DB-API, neue echte Bedrock-Prognosen und frisches verifiziertes Backup erfolgreich geprüft. Ablauf, kurzes Übergangsereignis und Nachprüfung: [Deployment-Reparatur](AWS_DEPLOYMENT_REPAIR_2026-09-16.md). Die folgenden Abschnitte dokumentieren den historischen Vorbereitungsstand vom 13.09.; ihre damaligen offenen Schritte wurden am 16.09. gemäß dem Nachtrag ausgeführt.

Stand: 13.09.2026, 15:07 UTC. Der Nutzer hat die Produktionsanbindung von Bedrock und der wiederhergestellten Datenbank beauftragt. **Die Umschaltung ist vorbereitet, aber noch nicht ausgeführt:** Die automatische Freigabe hat das Stoppen des bisherigen ECS-Services wegen der kurzfristigen Nichterreichbarkeit abgelehnt. Die ausdrückliche Freigabe dieser Unterbrechung wurde angefragt. Kein Umgehen dieser Sperre.

## Bereits erledigt

- Bestehendes Konto `186581960948`, Region `eu-central-1`, bestätigt.
- Produktionsservice `ai-sports-prediction-edge:65` weiterhin auf bisherigem Stand. Separater Worker-Service `desired=0`; genau ein Produktions-Task. Zwei Services insgesamt. AWS-Konsole zeigte keine Scheduler-Zeitpläne und keine älteren geplanten EventBridge-Regeln.
- Parameter `/ai-sports-prediction/database-url`: weiterhin Version 1, `SecureString`, Standard-Tier, `alias/aws/ssm`. Schlüssel und Tier im bestehenden Browser gelesen, keine Formularänderung gespeichert. Die eingeschränkte CLI durfte diese allgemeinen Metadaten nicht listen; keine IAM-Rechte erweitert.
- Geschützte Ausgangskonfiguration: `exports/recovery-cutover/2026-09-13/baseline.json`, Ordner `0700`, Datei `0600`, durch `exports/` aus Git/Docker ausgeschlossen. Enthält Referenzen und Konfiguration, keinen entschlüsselten Verbindungswert.
- Read-only-Prüfung bestanden: 37 Fremdschlüssel ohne verwaiste Beziehungen, 66 Check-Constraints ohne Verstöße, keine ungültigen Indizes oder widersprüchlichen Prognose-Revisionen/Kampagnen-Beziehungen, alle 21 Migrationen, drei aktive Trigger.
- Authentifizierungszustand im Ziel bestätigt: keine Widget-Kunden, keine Kunden-Login-Token, keine aktive Social-Verbindung; eine bereits getrennte Social-Verbindung. Ein wiederhergestellter Newsletter-Empfänger bleibt bis zu einem externen Einwilligungsabgleich vom Versand ausgeschlossen.
- Die zwei fachlichen Versand-/Publikations-Trigger bestanden sieben negative und vier positive Tests. Alle Probe-Datensätze wurden zurückgerollt; keine externen Nachrichten oder Aufrufe.
- Ausschließlich elf künstliche Recovery-Testdatensätze transaktional entfernt: drei Revisionen, ein Match-Snapshot, drei Prognosen, drei Modelle, ein Spiel. Exakte IDs/Attribute und abhängige Tabellen wurden vorab geprüft und gesperrt. Nachprüfung: keine künstlichen Datensätze mehr. Die vorhandenen Backups mit diesen Testdaten wurden nicht verändert oder gelöscht.

## Prüfnachweise

- Erster rein lesender Prüflauf `e988e076572e43f1a4c1263fdfeb613e` brach vor Änderungen ab: `pg` lieferte PostgreSQL-`name[]` als Zeichenkette. Der Katalog-Query wurde auf `text[]` korrigiert; keine Integritätsprüfung abgeschwächt.
- Erfolgreicher Read-only-Lauf: `105f784f53a044019d93cc741fb16dec`, Taskdefinition `ai-sports-prediction-cutover-check:2`.
- Erfolgreiche Triggerprüfung und Bereinigung: `ddc40c7f96de44e789494d2fccf19d82`, Taskdefinition `ai-sports-prediction-cutover-check:3`.
- Beide erfolgreichen Tasks `STOPPED`, Exitcode 0. Logs in `/ecs/ai-sports-prediction`, Präfix `cutover-check/cutover-check/<task-id>`.
- Geschützte aggregierte Nachweise: `exports/recovery-cutover/2026-09-13/inspect-passed.json` und `cleanup-passed.json`.
- Lokale Tests: acht Validator- und acht Worker-Tests bestanden, einschließlich vorbereiteter schreibgeschützter `production-proof`-Phase für reale Prognosen und anschließenden Backup-Nachweis.

## Vorbereiteter eingeschränkter Produktionsstart

Taskdefinition **`ai-sports-prediction-edge:66` ist registriert, aber noch nicht aktiv**. Sie verwendet das bereits geprüfte unveränderte App-Image, Digest `sha256:b55b67cfd867e7cb4800648d03eab734e6ae817aa90ae26df01e6779bb07a6cb`. Auch der bestehende Tunnel-Container wurde auf seinen bereits laufenden Digest festgelegt.

Der neue Worker verwendet `scripts/recovery-worker.mjs` als expliziten Command-Override, nicht den allgemeinen Worker:

- Keine Redis-Verbindung, keine Übernahme oder Löschung alter Warteschlangen.
- Nur Spielplan-Synchronisierung, Bedrock-Prognosen, verifizierte Backups, Quoten und Live-Ergebnisse.
- Start: Spielplan → genau ein Spiel prognostizieren → frisches Backup → weitere Sportdatenjobs. Danach maximal drei neue Spiele pro Prognoselauf; keine beschleunigten Intervalle gegenüber den bisherigen Einstellungen.
- Modell `eu.amazon.nova-2-lite-v1:0`, strikte TLS-Prüfung und fester Recovery-Endpunkt. Backups unter `ai-sports-prediction/backups/recovery-production-20260913`, weiterhin unter der bestehenden Ablaufregel.
- Keine E-Mail-, Social-, Zahlungs- oder Revenue-Handler und keine entsprechenden Secret-Injektionen. Fehlerausgaben werden bereinigt; Jobs laufen nacheinander mit Zeitlimits.

Auch Web/Admin/Kundenbereiche erhalten beim Neustart vorläufig keine Versand-, Zahlungs-, OAuth-, Kunden- oder Admin-Session-Secrets. Kunden-/Admin-Login und entsprechende externe Aktionen bleiben dadurch gesperrt, ohne Schlüssel zu drehen oder historische Token-Datensätze zu löschen. Öffentliche Sportdaten sowie neuer Newsletter-/Interessenten-Eingang und Abmeldungen bleiben möglich; der Webdienst ist damit ausdrücklich nicht vollständig schreibgeschützt. Die direkte API ist GET-only, ihr alter Redis-Cache wird deaktiviert.

Der beabsichtigte Secret-Wechsel ersetzt ausschließlich den alten Host durch `ai-sports-prediction-db-recovery-20260913.cl44cuw6mk0e.eu-central-1.rds.amazonaws.com`. Zugangsdaten, URL-Optionen, Verschlüsselung und Tier bleiben gleich; Version 1 wird erhalten. Der Wechsel darf nur bei gestoppten bisherigen Services und ohne weitere laufende Tasks erfolgen. Secret-Werte werden nur im Prozessspeicher und über stdin an AWS übergeben, nicht in Argumentlisten, Dateien oder Logs.

## Noch auszuführen

1. Ausdrückliche Zustimmung zur kurzen Produktionsunterbrechung abwarten. Bis dahin keine alternative oder indirekte Abschaltung.
2. Services kontrolliert stoppen und Stillstand bestätigen.
3. Geschützten Secret-Wechsel mit Readback und Nachweis der erhaltenen alten Version ausführen.
4. Revision 66 mit genau einem Task starten; stabilen Rollout, DB-gestützte öffentliche Healthchecks, echte Bedrock-Prognosen und den ersten frischen Backup-Zyklus prüfen.
5. Abschlussnachweise ergänzen. Externe Versand-/Zahlungs-/OAuth-Funktionen erst nach gesondertem Daten-/Einwilligungs-/Idempotenzabgleich wieder freigeben.

Der historische Wiederherstellungspunkt bleibt **26.08.2026, 08:48:39 MESZ**. Neuere verlorene Änderungen werden durch die Umschaltung nicht wiederhergestellt. Die alte defekte RDS-Instanz und alle Quellbackups bleiben erhalten. Die neue Instanz kostet weiterhin ca. 0,55 USD/Tag Grundkosten zuzüglich Nebenkosten; kein zusätzlicher Datenbank- oder Hostingservice angelegt.

Siehe [Wiederherstellungsnachweise](AWS_RDS_RECOVERY_RESULT_2026-09-13.md) und [ursprünglicher Plan](AWS_RDS_RECOVERY_PLAN_2026-09-13.md).
