# Sicherer RDS-Wiederherstellungsplan

Stand: 13. September 2026. **Phase A wurde nach der Planung ausdrücklich freigegeben: lokale und private S3-Sicherungskopie erstellt; die separate PITR-Testinstanz ist erfolgreich wiederhergestellt und in RDS verfügbar (`available`). DB-Lesetest, synthetischer Bedrock-Schreibtest und frischer Backup-/temporärer Restore-Test sind bestanden. Keine Produktionsumschaltung, keine Produktionsfreigabe und keine Berechtigungsänderung.** Aktuelle Nachweise stehen im [Ausführungsprotokoll](AWS_RDS_RECOVERY_RESULT_2026-09-13.md) und im [Sicherungsprotokoll](AWS_RECOVERY_BACKUP_PRESERVATION_2026-09-13.md). Die folgenden Abschnitte dokumentieren den ursprünglichen Plan und die weiterhin geltenden Freigabegrenzen; spätere Ausführungsergebnisse sind ausdrücklich eingeordnet.

## Ergebnis und empfohlener Weg

Im bestehenden AWS-Konto `186581960948`, Region `eu-central-1`, sind automatische Wiederherstellungspunkte, vier verfügbare RDS-Snapshots und ein separat gespeicherter logischer Export vorhanden. Zuerst eine **neue, private Testdatenbank** aus dem jüngsten nutzbaren verwalteten Backup wiederherstellen. Die ursprüngliche Datenbank, alle Quellbackups und die Produktionskonfiguration bleiben dabei erhalten. Erst nach Prüfung des tatsächlichen Datenstands und einer gesonderten Freigabe darf die Anwendung umgeschaltet werden.

Zum Planungszeitpunkt war die Existenz der Backups belegt, ihre vollständige Wiederherstellbarkeit noch nicht. Inzwischen sind die separate PITR-Wiederherstellung, isoliertes Lesen, synthetisches Bedrock-Schreiben mit Readback sowie ein frischer Backup-/temporärer Tabellen-Restore-Test erfolgreich. Das ersetzt keine vollständige semantische Fremdschlüssel-/Trigger-Prüfung oder die externen Queue-/Einwilligungsabgleiche vor einer Produktionsfreigabe. Der Snapshot-Erstellungszeitpunkt am 2. September beweist weiterhin insbesondere **keinen Datenstand vom 2. September**.

## Verifizierter Ausgangszustand

| Merkmal | Beobachtung |
| --- | --- |
| Datenbank | `ai-sports-prediction-db` |
| RDS-Ressourcen-ID | `db-47ZP3JC7XB42MG6HWGUGACL3VM` |
| Status | `inaccessible-encryption-credentials` – nicht die vorübergehend wiederherstellbare Variante |
| Fehlerhistorie | AWS-Konsole: 02.09.2026, 10:55 Uhr MESZ: maximale Zeit im recoverable-Zustand überschritten; 11:01 Uhr: terminaler Zustand, Empfehlung zur Zeitpunkt-Wiederherstellung |
| Einordnung | Der terminale Fehler bestand vor dem Bedrock-Rollout vom 13.09.; der ursprüngliche Auslöser ist weiterhin unklar. |
| KMS | AWS-verwalteter Schlüssel `127bd19d-08a5-4a97-a775-f8cd4c7e19a8`, bei Prüfung `Enabled` |
| Engine / Größe | PostgreSQL 18.3, `db.t4g.micro`, Single-AZ, 20 GiB gp3, 3000 IOPS, 125 MiB/s |
| Schutz | Verschlüsselt, nicht öffentlich erreichbar, Löschschutz aktiviert |
| Netzwerk | VPC `vpc-07f06e8a390a3abb5`, Subnetzgruppe `default-vpc-07f06e8a390a3abb5`, DB-Sicherheitsgruppe `sg-09ec4ac9ee3b17562` |
| Parameter / Optionen | `default.postgres18` / `default:postgres-18` |
| Aktuelle Anwendung | ECS-Service `ai-sports-prediction-edge`, Revision 65, Bedrock-Modellaufruf geprüft; echter Prognoselauf scheitert vor dem Modellaufruf an der DB-Verbindung |

Der Schlüssel wird nicht deaktiviert, ersetzt oder neu berechtigt. Ein bloßer Neustart der alten Instanz ist für diesen terminalen Zustand kein Wiederherstellungsweg. [AWS: RDS-Verschlüsselung und Fehlerzustände](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html)

## Gefundene Sicherungen

### 1. Automatische Zeitpunkt-Wiederherstellung – bevorzugter erster Versuch

Die AWS-Konsole zeigte zum Planungszeitpunkt für diese Datenbank folgenden Zeitraum:

- Frühester Zeitpunkt: **25.08.2026, 08:48 MESZ** (Anzeige auf Minuten gerundet).
- Spätester Zeitpunkt: **26.08.2026, 08:48 MESZ**; die API präzisiert `2026-08-26T06:48:39Z`.
- Region Frankfurt, verschlüsselt, bestehende Aufbewahrungseinstellung ein Tag.

Vorgabe aus der Planung: Vor Ausführung den Zeitraum erneut lesen und den konkreten jüngsten Zeitpunkt festhalten. Keine spätere Zeit annehmen. Als Ziel wurde eine neue Instanz vorgeschlagen, beispielsweise `ai-sports-prediction-db-recovery-20260913` (Name vor Erstellung auf Kollision prüfen). Die separate PITR-Testinstanz ist inzwischen verfügbar; genaue Ausführungsdaten, bestandene Tests und verbleibende Prüfgrenzen stehen im [Ausführungsprotokoll](AWS_RDS_RECOVERY_RESULT_2026-09-13.md). AWS erstellt bei einer Zeitpunkt-Wiederherstellung eine neue Instanz und verändert die Quelle nicht. [AWS: Point-in-time restore](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html)

### 2. Verfügbare RDS-Snapshots – alternativer verwalteter Weg

Alle vier waren am 13.09.2026 in der AWS-Konsole als **Verfügbar** markiert:

| Snapshot-ID | Erstellung (MESZ) | Typ |
| --- | --- | --- |
| `rds-final:ai-sports-prediction-db-db-47zp3jc7xb42mg6hwgugacl3vm` | 02.09.2026, 11:01 | Manuell |
| `rds:ai-sports-prediction-db-2026-08-25-20-22` | 25.08.2026, 22:22 | Automatisiert |
| `rds:ai-sports-prediction-db-2026-08-24-20-22` | 24.08.2026, 22:22 | Automatisiert |
| `rds:ai-sports-prediction-db-2026-08-23-20-22` | 23.08.2026, 22:22 | Automatisiert |

Der finale Snapshot hat PostgreSQL 18.3, 20 GiB gp3 und denselben KMS-Schlüssel. Er ist die erste Snapshot-Alternative, falls PITR nicht ausführbar ist. Bei Entschlüsselungsfehlern nicht wahllos Berechtigungen verändern: Fehler dokumentieren und AWS Support bzw. den unabhängigen Export prüfen. Auch ein Snapshot-Restore muss eine neue Instanz verwenden; VPC, Subnetz- und Sicherheitsgruppe ausdrücklich setzen, nicht auf Restore-Defaults vertrauen. [AWS: Snapshot-Wiederherstellung](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html)

### 3. Separater logischer Export – Rückfallebene

```text
Bucket: ai-sports-prediction
Key: ai-sports-prediction/backups/postgres-logical-2026-08-26T00-00-27-416Z.jsonl.gz
VersionId: yQJE50dNJ.1DtRhJiF_WSd80JjLi.hcb
Größe: 3.073.635 Bytes
LastModified: 2026-08-26T00:00:29Z
Verschlüsselung: AES256 / SSE-S3, unabhängig vom RDS-KMS-Schlüssel
Angekündigte Lifecycle-Ablaufzeit: 2026-10-01T00:00:00Z
```

Zum Planungszeitpunkt wurde im konfigurierten S3-Präfix kein neuerer Export gefunden. CloudWatch dokumentiert für diese Datei am 26.08.2026 zwischen 00:00:28 und 00:01:02 UTC einen erfolgreichen Download-/Prüfsummenvergleich und einen temporären Restore-Test. Quelle: Loggruppe `/ecs/ai-sports-prediction`, Stream `edge-worker/worker/1f7cd06b58fa4a5081ac5fea4503b819`.

**Vorgabe aus der Planung: Vor Ausführung zuerst diesen Export gegen Ablauf sichern.** Nach Freigabe eine private, verschlüsselte Sicherung außerhalb der erfassten Lifecycle-Regeln erstellen und Version/Prüfsumme protokollieren. Ein anderes Präfix im selben Bucket genügt nur, wenn nachweislich keine passende Ablaufregel greift. Kein Original verschieben oder löschen, keinen Bucket öffentlich machen, keine Lifecycle-Regel ungeprüft abschalten. Zum damaligen Planungsstand war ausschließlich Metadaten-/Logzugriff erfolgt, noch kein Download oder Kopiervorgang.

**Anschließend ausgeführt:** Die exakte Quellversion wurde lokal geschützt gespeichert und vollständig auf Prüfsumme sowie gzip-/JSONL-Lesbarkeit geprüft. Zusätzlich entstand eine private, SSE-S3-verschlüsselte Kopie unter `recovery-preserved/2026-09-13/` im selben Bucket, außerhalb der einzigen geltenden Ablaufregel und ohne angezeigtes Ablaufdatum. Version und CRC32-Inhaltsvergleich sind im [Sicherungsprotokoll](AWS_RECOVERY_BACKUP_PRESERVATION_2026-09-13.md) dokumentiert. Original und Lifecycle-Regeln blieben unverändert; das oben genannte Ablaufdatum gilt weiterhin für die Quelle, nicht für die neue Kopie.

Der danach erzeugte und geprüfte frische Export der Testinstanz enthält den wiederhergestellten August-Stand plus künstliche Recovery-Testdaten, keinen nachträglich geretteten September-Datenstand. Er ist ein separates Objekt im bisherigen Backup-Präfix und unterliegt dessen Ablaufregel; Details stehen im [Ausführungsprotokoll](AWS_RDS_RECOVERY_RESULT_2026-09-13.md).

Der Export ist kein sofort importierbarer SQL-Dump: Im Repository gibt es derzeit keinen dauerhaften JSONL-Importer. Ein solcher müsste gesondert gebaut und getestet werden. Die vorhandene temporäre Prüfung testet nicht alle produktiven Fremdschlüssel und Trigger. Der Export liest Tabellen nacheinander ohne gemeinsame Snapshot-Transaktion; übergreifende Konsistenz ist deshalb explizit zu prüfen. Lokale Exporte vom 1. Juli sind nur 123–656 Bytes groß und kein neuerer Ersatz.

## Ablauf mit getrennten Freigaben

### Phase A – Sicherung und isolierter Wiederherstellungstest

Die erforderliche Freigabe zur Sicherungskopie, zur kostenpflichtigen Testinstanz und zum kontrollierten Test wurde erteilt. Sicherung und separate PITR-Wiederherstellung sind ausgeführt; DB-Lesetest, synthetischer Bedrock-Schreibtest und frischer Backup-/temporärer Restore-Test sind bestanden. Die folgenden historischen Ablaufvorgaben und weitergehenden Prüfgrenzen bleiben maßgeblich. Weiterhin **keine** Umschaltung oder Freigabe der Produktion.

1. Konto, Region, Quell-Backup, Zeitpunkt und freien Zielnamen erneut bestätigen. Bestehende Taskdefinition, Datenbankkonfiguration und Verbindungskonfiguration geschützt dokumentieren; keine Passwörter oder Verbindungs-URLs in Logs/Plan übernehmen.
2. Den separat vorhandenen Export wie oben beschrieben sichern. Die RDS-Snapshots ebenfalls unverändert erhalten.
3. Eine neue private Instanz mit bestehender Größe/Engine-Kompatibilität, Verschlüsselung, Löschschutz und explizit passendem Netzwerk wiederherstellen. Keine öffentliche Erreichbarkeit und keine Öffnung von Port 5432 ins Internet. Parameter-/Optionsgruppe explizit prüfen. Storage-Autoscaling und Backup-Retention vor Erstellung bewusst festlegen; die bestehende 1000-GiB-Autoscaling-Obergrenze nicht ungeprüft übernehmen.
4. Einen isolierten Prüfprozess im VPC nutzen, mit eigener Zielverbindung und aktivierter TLS-Zertifikatsprüfung. Den produktiven `DATABASE_URL`-Wert **nicht** verändern. Keine Verbindung des Tests zu produktiven Redis-Queues, E-Mail-, Social-Media- oder Zahlungsdiensten.
5. **Nicht den normalen Worker starten:** Er registriert neben Prognosen auch Marketing-, Outreach-, Backup- und Revenue-Jobs. Für den Test nur gezielte Befehle mit den unbedingt benötigten Zugangsdaten verwenden.
6. Erst den vorhandenen Schema-/Migrationsstand lesen; notwendige Migrationen prüfen und nur auf der Testinstanz anwenden. Keine unkontrollierten destruktiven Migrationen.

### Phase B – Nachweis statt bloßem grünen Status

**Ausführungsstand:** Die drei isolierten Test-Tasks sind beendet (`STOPPED`), jeweils mit Exitcode 0. Vor dem Schreibtest wurden 43 Tabellen mit 29.237 Zeilen, 402 Spielen, 503 Prognosen und allen 21 Migrationen gelesen; TLS mit Zertifikatsprüfung und die geprüften Repository-Lesepfade funktionierten. Anschließend wurden genau drei künstliche Bedrock-Prognosen und drei Revisionen gespeichert und wieder ausgelesen. Der frische Export bestand erneuten S3-Download mit identischer SHA-256, temporären Tabellen-Restore und Audit. Dies sind begrenzte, dokumentierte Testnachweise: Die vollständige Fremdschlüssel-/Trigger-Semantik sowie externe Queue-, Einwilligungs-, Idempotenz- und Login-/OAuth-Abgleiche sind **nicht erledigt**. Künstliche Testdatensätze müssen vor einer Umschaltung entfernt oder sicher isoliert werden. Einzelheiten und Datenstichtag: [Ausführungsprotokoll](AWS_RDS_RECOVERY_RESULT_2026-09-13.md).

Vor jeder Umschaltung müssen folgende Ergebnisse vorliegen:

- RDS `available`, echte PostgreSQL-Verbindung mit TLS, API-DB-Health erfolgreich. Der öffentliche Web-Endpunkt `/api/health` allein bestätigt **keine** Datenbankfunktion.
- Tabellenumfang, Zeilenzahlen und jüngste fachliche Zeitstempel prüfen, insbesondere `models`, `matches`, `match_data_snapshots`, `predictions`, `prediction_revisions`, `benchmark_predictions`, `prediction_evaluations`, `special_predictions`, Backup- und relevante Kunden-/Freigabetabellen. Nur aggregierte Prüfergebnisse protokollieren.
- Tatsächlichen Datenstichtag feststellen. Bei PITR ist nur bis zum bestätigten Wiederherstellungszeitpunkt mit Daten zu rechnen; spätere Änderungen sind nicht zugesichert. Ein „Snapshot vom 2. September“ darf nicht als Beweis jüngerer Datensätze gelten.
- Fremdschlüssel, Eindeutigkeit, Sequenzen, Check-Constraints und fachliche Freigabe-Trigger prüfen. Bei logischem Import insbesondere `schema_migrations` nicht blind doppelt einfügen und Trigger nicht pauschal deaktivieren.
- Alte Prognosen über DB-gestützte API-Pfade lesen und genau einen kontrollierten Bedrock-Prognosesatz in die Testdatenbank schreiben und wieder auslesen. Keine Nachrichten senden oder abrechnungsrelevanten Jobs ausführen.
- Einen frischen Backup-/Restore-Nachweis des wiederhergestellten Ziels erstellen. Kein Quellbackup überschreiben. Nachweis, Datenlücke und offene Fehler zusammenfassen.

Wenn ein Test scheitert: Originale unverändert lassen, keine Produktionsumschaltung und keine automatische Löschung. Ursache und nächste Option vorlegen. Ein alternativer Restore wird nicht unbemerkt zu einer zweiten dauerhaft laufenden Instanz.

### Phase C – spätere Produktionsumschaltung

Erst nach gesonderter Zustimmung zu geprüftem Datenstand, möglichen Datenlücken und laufenden Kosten:

1. Produktions-Schreibzugriffe und Worker koordiniert pausieren bzw. abschirmen; keine Queues löschen. Das konsolidierte ECS-Deployment berücksichtigt Web/API/Worker gemeinsam.
2. Vorhandenen Queue-Rückstand und Idempotenz prüfen: zurückgesetzte DB-Zustände dürfen keine bereits versendeten Nachrichten oder Abrechnungen erneut auslösen.
   Zusätzlich spätere Abmeldungen, Einwilligungswiderrufe, Sperren und externe Versand-/Abrechnungsprotokolle mit den jeweiligen Anbietern abgleichen. Ein älterer Restore darf solche neueren Schutzentscheidungen nicht rückgängig machen. Alte Login-, OAuth- und Session-Zustände nicht ungeprüft wieder aktivieren; erforderliche Schutzmaßnahmen vor Wiederöffnung gesondert festlegen.
3. Verbindung über den bestehenden sicheren Secret-/Parameter-Mechanismus umstellen, alte Version geschützt erhalten und alle betroffenen Container kontrolliert neu ausrollen. Keine DB-Zugangsdaten ins Repository oder Terminal ausgeben.
4. Datenbankgestützte Healthchecks, echte Prognosespeicherung und einen vollständigen Backup-Zyklus bestätigen. Externe Nebenwirkungen erst gezielt wieder freigeben.
5. Alte Instanz und Quellbackups behalten. Aufräumen, Löschen oder Aufbewahrungsänderungen benötigen eine eigene Entscheidung nach erfolgreicher Abnahme.

**Rückfallgrenze:** Die alte Instanz ist nicht funktionsfähig. Ein Zurücksetzen der Anwendungsrevision oder des alten DB-Endpunkts stellt deshalb keinen funktionierenden Dienst wieder her. Bei Problemen nach Umschaltung neue Schreibzugriffe stoppen und den neuen Datenstand sichern; keine zwischenzeitlich entstandenen Daten durch blindes Zurückschalten verlieren.

## Kostenrahmen für den Test

Offizielle On-Demand-Liste für Frankfurt, geprüft am 13.09.2026 (Veröffentlichung 11.09.2026):

| Posten | Richtwert USD |
| --- | ---: |
| PostgreSQL `db.t4g.micro`, Single-AZ | 0,019 pro Stunde |
| gp3 | 0,137 pro GB-Monat |
| 20 GiB Speicher | 2,74 pro Monat |
| 24 Stunden Compute + anteiliger Speicher | ca. **0,55** |
| 730 Stunden Compute + Speicher | ca. **16,61** |

Quelle: [AWS Price List, RDS eu-central-1](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/eu-central-1/index.json), Compute-SKU `Q2VA4XH2YFYXPGX4`, Speicher-SKU `JN8MTUNBMV3GFTFY`. Die Basisleistung 3000 IOPS / 125 MiB/s ist für diese gp3-Größe enthalten. [AWS: RDS-Speicher](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html)

Dies ist **kein Gesamtpreis und kein Kostenlimit**: Steuern, zusätzliche Backups/Sicherungskopien, CPU-Credit-Mehrverbrauch, Datenübertragung, ECS-Testlauf und Bedrock-Aufruf kommen gegebenenfalls hinzu; Rabatte/Guthaben sind nicht eingerechnet. Speicher-Anteil mit 730 Stunden pro Monat kalkuliert. Stoppen beendet nicht die Speichergebühren. Für die Testphase zunächst nur eine Instanz vorsehen und danach über Weiterbetrieb oder separat freizugebendes Aufräumen entscheiden. [AWS: PostgreSQL-Preise](https://aws.amazon.com/rds/postgresql/pricing/)

## Berechtigungen und offene Punkte

- Der lokale Deployment-Benutzer kann RDS-Instanzmetadaten lesen, aber keine RDS-Ereignisse oder Snapshot-Listen. Diese wurden über die bereits angemeldete AWS-Konsole `jonas_sdr` im selben Konto verifiziert. Berechtigungen wurden nicht erweitert.
- Beim Planungsstand wurden S3-Objektmetadaten und historische Backup-Logs gelesen. Allgemeine Bucket-Versionierungs-/Verschlüsselungskonfiguration war per CLI nicht lesbar; die konkrete Objektversion und SSE-S3-Verschlüsselung stammten aus erfolgreichem `HeadObject`. Bei der Ausführung bestätigte die bestehende AWS-Konsole zusätzlich Versionierung, öffentlichen Zugriffsschutz, SSE-S3 und fehlenden Ablauf der neuen Kopie. Der lokale Download und dessen Prüfergebnisse sind separat dokumentiert.
- Die zunächst offene Berechtigungsfrage für Restore und KMS-Nutzung wurde bei der Ausführung über die bereits berechtigte AWS-Konsole geklärt: Die separate PITR-Instanz wurde erfolgreich erstellt und ist verfügbar. Dabei kamen weder Rechteerweiterungen noch Root-Zugangsdaten oder neue langfristige Schlüssel zum Einsatz. Die Leseeinschränkungen der CLI-Identität bleiben bestehen.
- Der ursprüngliche Anlass für den Verlust der RDS-Schlüsselnutzung ist noch ungeklärt. Der aktivierte Schlüssel allein war kein Restore-Nachweis; inzwischen sind die separate PITR-Wiederherstellung und die dokumentierten Lese-, synthetischen Schreib- und Backup-/temporären Restore-Tests erfolgreich. Vollständige semantische Fremdschlüssel-/Trigger-Prüfung, externe Queue-/Einwilligungsabgleiche und die übrigen Produktionsabnahmeprüfungen bleiben offen; die erfolgreichen isolierten Tests sind keine Produktionsfreigabe.
- Phase A samt Kosten wurde ausdrücklich freigegeben. Weiterhin separat erforderlich: Abnahme des tatsächlichen Datenstands und Freigabe der Produktionsumschaltung.

Repository-Grundlagen: [Backup-Verfahren](backup_and_restore.md), [ECS-Konfiguration](AWS_ECS_FARGATE.md), [Bedrock-Rollout](AWS_BEDROCK.md).
