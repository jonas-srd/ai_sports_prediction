# Build-/Deployment-Reparatur vom 16.09.2026

Stand: 16.09.2026, 20:29 UTC. Auftrag: alle am 16.09. diagnostizierten Fehler beheben. Lokale Reparaturen und sichere Vorarbeiten sind abgeschlossen; **die Datenbank-Umschaltung ist noch nicht erfolgt**. Die gesonderte Freigabe der kurzen Produktionsunterbrechung wurde erneut angefragt und steht aus.

## Implementierte Code-Korrekturen

- TypeScript: entfernte `baseUrl`-Option und nicht mehr erforderliches `ignoreDeprecations` entfernt; `@/*` bleibt relativ zu `./src/*` aufgelöst. Next verwendet den mit TypeScript 6 und 7 kompatiblen CLI-Prüfer.
- Deployment: vorherige Taskdefinitionen **und gewünschte Taskanzahlen** werden gespeichert. Ein Fehler vor dem Service-Deployment, etwa bei der Migration, löst keinen Rollback aus.
- Rollback: nur tatsächlich veränderte Dienste werden zurückgesetzt, ohne erzwungenen Neustart. Ein zuvor stillgelegter Worker bleibt bei `desiredCount=0`. Kontoprüfung und vollständige Snapshot-Validierung erfolgen vor Änderungen; ein Fehler bei einem Service verhindert nicht den Rücksetzversuch des anderen.
- Recovery-Schutz: ein Standard-Deployment wird vor Image-Publikation, Migration oder Service-Änderung abgebrochen, wenn die laufende Taskdefinition den eingeschränkten Recovery-Modus verwendet. Das verhindert die versehentliche Reaktivierung von Redis, Versand, Zahlungs-/Social-Funktionen und deren Secrets. Ein späterer normaler Rollout benötigt einen gesondert geprüften Übergang.
- Recovery-Abnahme: `production-proof` benötigt jetzt ein explizites aktuelles UTC-Fenster (`RECOVERY_PROOF_SINCE_UTC`, `RECOVERY_PROOF_BEFORE_UTC`, höchstens 24 Stunden); keine fest auf den 13.09. begrenzte Prüfung mehr. Neue Prognosen, passende Revisionen und verifizierte Backups müssen darin liegen.
- Alle Betriebsskript-Tests sind über `npm run test:operations` in `npm test` und damit in beide CI-Workflows eingebunden.

## Lokale Verifikation

- TypeScript 6.0.3: gesamtes `npm run typecheck` und Produktions-Build erfolgreich, 4.889 Seiten.
- TypeScript 7.0.2: isoliert im temporären Verzeichnis installiert, sämtliche Workspace-Typechecks und Nexts tatsächlicher CLI-Prüfer inklusive generierter Routentypen erfolgreich. Keine Änderung der Projekt-Abhängigkeiten oder Lockdatei.
- 81 Webtests, 67 Worker-/Pakettests und 35 Betriebsskript-Tests erfolgreich (183 insgesamt).
- `git diff --check` erfolgreich. Kein Commit, Push oder erneuter GitHub-Workflow-Start durchgeführt.

## AWS-Vorarbeiten und neue Nachweise

- Konto `186581960948`, Region `eu-central-1` bestätigt.
- Die durch den fehlerhaften Rollback reaktivierten erfolglosen Startversuche von `ai-sports-prediction-worker:23` wurden beendet: `desired=0`, `running=0`, `pending=0`. Der Web-/Edge-Service blieb unverändert auf Revision 65 mit einem laufenden Task.
- Das getestete Image `sha256:b55b67cfd867e7cb4800648d03eab734e6ae817aa90ae26df01e6779bb07a6cb` ist weiterhin in ECR vorhanden. Die vorbereitete eingeschränkte Revision 66 ist weiterhin registriert, nicht ausgerollt.
- Recovery-Datenbank `ai-sports-prediction-db-recovery-20260913` nach automatischem Backup wieder `available`; verschlüsselt, nicht öffentlich, Löschschutz aktiv. Neuester sichtbarer PITR-Sicherungspunkt 16.09.2026, 20:22:51 UTC. Das ist **kein** Nachweis nachträglich wiederhergestellter fachlicher Daten nach dem ursprünglichen Wiederherstellungspunkt 26.08.2026.
- Neuer rein lesender `prove`-Task `6e55da65638142c8be300126cf9645c2`, Taskdefinition `ai-sports-prediction-cutover-check:4`, beendet mit Exitcode 0. 37 Fremdschlüssel, 66 Check-Constraints, 21 Migrationen und drei Trigger geprüft; keine Integritätsverstöße und keine synthetischen Testdatensätze. Keine Bereinigung wiederholt.
- Ein vorgeschalteter kurzlebiger No-op-Task `6dd54fdddf9c4be6a1cdca716f9ad564` ebenfalls beendet mit Exitcode 0. Die ersten zwei Registrierungsversuche des Prüf-Tasks scheiterten lokal am nicht lesbaren CLI-stdin-Dateipfad, bevor AWS eine neue Taskdefinition anlegte; anschließend gelang die Registrierung über eine geschützte Datei ohne Secret-Werte.
- Geschützte aggregierte Nachweise und aktuelle Baseline: `exports/recovery-cutover/2026-09-16/`, aus Git ausgeschlossen. Secret-Parameter unverändert auf Version 1, alter DB-Hostname. Kein Secret-Wert in Dateien, Argumenten oder Protokollen gespeichert.

## Noch erforderlich

1. Ausdrückliche Freigabe der kurzen Website-Unterbrechung abwarten; nicht durch ein alternatives Deployment umgehen.
2. Unmittelbar davor aktive Dienste/Tasks, DB-Verfügbarkeit und Aktualität des lesenden Nachweises erneut prüfen. Ursprünglichen Bereinigungsnachweis vom 13.09. erhalten; bei veraltetem Nachweis ausschließlich `prove` wiederholen.
3. Vorherige Task-ARNs erfassen, Edge kontrolliert stoppen und **tatsächlichen STOPPED-Status aller vorherigen Tasks** bestätigen; gewünschter Status oder Service-Zähler alleine reichen nicht.
4. Nur den Host des bestehenden SecureString-Parameters auf die Recovery-DB wechseln, sonst alle URL-Bestandteile erhalten. Offizielles AWS-SSM-SDK mit Wert ausschließlich im Speicher verwenden; Readback und erhaltene Version 1 prüfen. Bei ungewissem Ergebnis zuerst Metadaten prüfen, nicht blind wiederholen.
5. Eingeschränkte Revision 66 mit genau einem Task starten, separaten Worker bei null lassen. Nicht automatisch auf Revision 65 mit wiederhergestelltem Datenbankziel zurückrollen, da dies die geschützten Geschäftsfunktionen reaktivieren könnte.
6. ECS-Stabilität **und** laufenden Recovery-Worker, dessen Readiness/Jobausgänge, DB-gestützte öffentliche Endpunkte, neue echte Bedrock-Prognosen und frisches verifiziertes Backup nachweisen. Der Worker ist nicht essenziell; ein stabiler ECS-Service allein genügt nicht.
7. Ergebnis hier und im [Cutover-Protokoll](AWS_RDS_CUTOVER_2026-09-13.md) nachtragen. Standard-Deployment und geschäftliche Nebenwirkungen erst nach eigenständig geprüftem Übergang freigeben.

Die alte defekte Datenbank und alle vorhandenen Backups bleiben erhalten. Der ursprüngliche Daten-Wiederherstellungspunkt bleibt 26.08.2026, 08:48:39 MESZ.
