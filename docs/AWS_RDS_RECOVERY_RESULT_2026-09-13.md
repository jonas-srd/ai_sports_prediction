# RDS-Test-Wiederherstellung: Ausführungsprotokoll

Stand: 13.09.2026. Ausdrücklicher Auftrag: Backup sichern und eine separate Test-Wiederherstellung starten, **ohne Produktionsumschaltung**.

**Ergebnis: Sicherung, PITR-Testwiederherstellung, DB-Lesetest, synthetischer Bedrock-Schreibtest und frischer Backup-/temporärer Restore-Test erfolgreich. Die Produktion ist unverändert und weiterhin nicht auf die Testdatenbank umgestellt.**

## Sicherungen

Der Export vom 26.08.2026 wurde lokal geschützt und zusätzlich im bestehenden privaten S3-Bucket außerhalb der Ablaufregel gesichert. Die vollständige CRC32-Prüfsumme der Cloud-Kopie stimmt mit der lokalen Datei überein. Alle Quellen bleiben unverändert. [Details und Versionen](AWS_RECOVERY_BACKUP_PRESERVATION_2026-09-13.md)

## Erfolgreicher Restore und Lesetest

- Konto `186581960948`, Region `eu-central-1`.
- Quelle `ai-sports-prediction-db`, Zeitpunkt-Wiederherstellung auf den angezeigten jüngsten Stand `2026-08-26T06:48:39Z`.
- Neue Testinstanz `ai-sports-prediction-db-recovery-20260913`.
- Start über die vorhandene AWS-Konsolensitzung `jonas_sdr`; der lokale Deployment-Benutzer hat keine Restore-Berechtigung. Keine IAM-Rechte erweitert.
- AWS bestätigte nach Erstellung und initialer Sicherung Status `available`.
- Neuer Endpunkt: `ai-sports-prediction-db-recovery-20260913.cl44cuw6mk0e.eu-central-1.rds.amazonaws.com`.

Per API nach Start bestätigte Einstellungen: PostgreSQL 18.3, `db.t4g.micro`, Single-AZ, 20 GiB gp3, keine aktivierte Speicher-Autoskalierung, kein öffentlicher Zugriff, bestehende RDS-Verschlüsselung, Löschschutz und ein Tag automatische Backups. Vorhandene VPC/Subnetzgruppe und DB-Sicherheitsgruppe wurden beibehalten. Keine zweite Testinstanz erstellt.

Der isolierte Lesetest endete erfolgreich mit Exitcode 0 am 13.09.2026 gegen 14:29 UTC:

| Prüfung | Ergebnis vor synthetischen Schreibtests |
| --- | --- |
| Verbindung | DB-Health erfolgreich, TLS 1.3 mit Zertifikatsprüfung, Read-only-Transaktion |
| Umfang | 43 Tabellen, 29.237 Zeilen, davon 17 Tabellen nicht leer |
| Spiele / Prognosen / Revisionen | 402 / 503 / 456 |
| Daten-Snapshots / Modelle | 3.177 / 7 |
| Migrationen | Alle 21 vorhanden, keine fehlenden oder zusätzlichen Migrationen |
| Schema-Metadaten | 169 validierte Constraints; 120 gültige/bereite Indizes; drei aktivierte benutzerdefinierte Trigger, einschließlich beider Versand-/Veröffentlichungssperren; keine öffentlichen Sequenzen |
| Repository-Lesepfade | 402 Dashboard-Spiele; 16 Prognosen für fünf historische Beispiel-Spiele; Benchmark-/Sonderprognosen leer, Abfragen erfolgreich |

Tatsächlicher Datenstand: jüngste Job-Aktivität `2026-08-26T06:48:00.142295Z`, jüngste Spielaktualisierung `2026-08-26T06:45:01.429358Z`. Die jüngsten bereits vorhandenen Prognosen stammen hingegen vom **17.08.2026**; ein späterer Spieltermin ist kein Beleg für spätere Datensicherung. Änderungen nach dem PITR-Zeitpunkt **26.08.2026, 08:48:39 MESZ** sind nicht wiederhergestellt bzw. nicht zugesichert.

Read-Task: `9421f7fc1b7d49978bfc104aa04ccdc2`, Taskdefinition `ai-sports-prediction-recovery-check:1`, CloudWatch-Stream `recovery-check/recovery-check/9421f7fc1b7d49978bfc104aa04ccdc2` in `/ecs/ai-sports-prediction`. Schema-Metadatenprüfung ist **keine** vollständige semantische Fremdschlüssel-/Trigger-Prüfung.

## Bedrock-Schreibtest bestanden

Der genau einmal ausgeführte künstliche Prognosetest endete am 13.09.2026 um 14:33 UTC mit Exitcode 0. Amazon Bedrock, Modell `eu.amazon.nova-2-lite-v1:0`, lieferte die Profile `nexus`, `pulse` und `edge`. Alle drei Prognosen sowie drei Revisionen wurden über die bestehenden Repository-Funktionen im isolierten Ziel gespeichert und wieder ausgelesen; Provider und IDs wurden geprüft.

- Task `d4cf304ace0f48fa96e9864938fe25d8`, Taskdefinition `ai-sports-prediction-recovery-check:2`.
- CloudWatch-Stream `recovery-check/recovery-check/d4cf304ace0f48fa96e9864938fe25d8` in `/ecs/ai-sports-prediction`.
- Bedrock-Request-ID `56716556-9ddf-4f85-89eb-a18ceb963df3`, 302 Eingabe- und 151 Ausgabetokens.
- Eindeutig künstliches Spiel `recovery-verification:recovery-20260913-a`, Datum 01.01.2099, Quelle `recovery-verification`; drei Testmodell-IDs mit demselben Präfix und den Profilsuffixen. Testmodelle wurden inaktiv gesetzt.
- **Diese Testdatensätze bleiben ausschließlich im Testziel und müssen vor einer späteren Produktionsumschaltung entfernt oder sicher isoliert werden.** Derselbe Lauf darf nicht blind wiederholt werden.

## Frischer Backup-/Restore-Test bestanden

Der anschließend und ohne parallelen Schreibtest ausgeführte Backup-Task `1fd60b3fb7bb4eaca85d1c3833bc04f8`, Taskdefinition `ai-sports-prediction-recovery-check:3`, endete mit Exitcode 0. CloudWatch-Stream: `recovery-check/recovery-check/1fd60b3fb7bb4eaca85d1c3833bc04f8` in `/ecs/ai-sports-prediction`.

Geprüfte Schritte: logischer Export und gzip/JSONL-Prüfung, S3-Upload, erneuter Download mit identischer SHA256, temporärer Tabellen-Restore samt Zeilenzahlen, erfolgreicher Audit-Eintrag in der **Testdatenbank**. Abschluss: `2026-09-13T14:37:19.152Z`.

```text
Bucket: ai-sports-prediction
Key: ai-sports-prediction/backups/recovery-check-20260913/postgres-logical-2026-09-13T14-36-51-503Z.jsonl.gz
VersionId: zbuh95pZ8fOD99jTJq7z7JUCNscn3xPx
SHA256: 34471d59d99cb3c39062d15412303b3f6b76da16969439ad41edd32b53eeb0be
Bytes: 3092040
Audit-Artefakt-ID: f5d8cd32-4d0a-409d-b93c-951c50404eae
Verschlüsselung: AES256 / SSE-S3
Angekündigter Ablauf: 2026-10-19T00:00:00Z
```

Dieser neue Export enthält den wiederhergestellten historischen Stand **plus künstliche Recovery-Testdaten**: 403 Spiele, 506 Prognosen, 459 Revisionen, 3.178 Match-Snapshots, zehn Modelle. Sein Erstellungsdatum im September bedeutet keinen nachträglich geretteten fachlichen Datenstand aus September. Er unterliegt der bestehenden 35-Tage-Lifecycle-Regel; die separat gesicherte August-Archivkopie außerhalb dieser Regel bleibt erhalten.

Der temporäre Restore testet keine vollständige Fremdschlüssel-/Trigger-Semantik. Der bestehende Exporter verwendet keine gemeinsame Snapshot-Transaktion; während dieses Tests lief auf dem isolierten Ziel kein normaler Worker und kein weiterer von uns gestarteter Schreibtest. Das Manifest im kurzlebigen ECS-Dateisystem ist kein separat dauerhaft gesichertes Cloud-Artefakt; Audit, S3-Objekt und folgende lokale Nachweise bleiben über den Task-Lauf hinaus erhalten, das neue S3-Objekt mit der oben genannten Ablauffrist.

## Abschlusszustand und Nachweise

- Quelle weiterhin `inaccessible-encryption-credentials`; nicht gelöscht oder verändert. Testziel `available`, verschlüsselt, `PubliclyAccessible=false`, Löschschutz aktiv, Single-AZ, 20 GiB ohne Autoscaling.
- Produktionsservice weiterhin `ai-sports-prediction-edge:65`, `desired=1`, `running=1`, `pending=0`, Rollout `COMPLETED`. Kein Secret-/Queue-/IAM-/KMS-/Produktions-Netzwerkwechsel.
- Alle drei kurzlebigen Test-Tasks sind `STOPPED`, jeweils Exitcode 0. Die registrierten Test-Taskdefinitionen bleiben erhalten und starten nicht selbstständig. Die separate RDS-Testinstanz läuft kostenpflichtig weiter; kein Lösch- oder Stoppauftrag ausgeführt.
- Alle Tests verwendeten das vorhandene immutable Image `sha256:b55b67cfd867e7cb4800648d03eab734e6ae817aa90ae26df01e6779bb07a6cb`; kein neues Produktionsimage gebaut.
- Vollständige aggregierte Prüfnachweise: `exports/recovery-preserved/2026-09-13/verification-evidence.json`, Dateimodus `0600`, Ordner `0700`, aus Git und Docker-Kontext ausgeschlossen. Keine Datenbank-Zeileninhalte oder Zugangsdaten in diesen Prüflogs.
- Lokale Guard-Tests `node --test scripts/recovery-verify.test.mjs`: 5/5 erfolgreich. Prüfskript: `scripts/recovery-verify.mjs`.
- Nicht blockierende Runtime-Warnung: Das verwendete AWS SDK kündigt Node >=22 für ab Januar 2027 veröffentlichte SDK-Versionen an. Dieses Image nutzt Node 20.20.2; ein Runtime-Upgrade ist eine separate Wartungsaufgabe, nicht Bestandteil der Wiederherstellung.

## Prüfgrenzen

Die isolierten Prüfprozesse nutzen nur die bestehende Datenbank-Secret-Referenz und eine im Prozess auf den neuen Host begrenzte Verbindung. Die produktive Secret-Version und das ECS-Produktionsdeployment bleiben unangetastet. Kein normaler Worker, keine Produktionsqueues und keine Versand-/Zahlungszugangsdaten werden verwendet.

Vor einer späteren Produktionsfreigabe bleiben die im [Plan](AWS_RDS_RECOVERY_PLAN_2026-09-13.md) beschriebenen weitergehenden Integritäts-, Einwilligungs-/Idempotenz- und Abnahmeprüfungen erforderlich, insbesondere Abgleich späterer externer Änderungen und alter Queue-Aufträge, Behandlung wiederhergestellter Login-/OAuth-Zustände und Akzeptanz der möglichen Datenlücke. Die vorhandenen synthetischen Testdaten müssen vor einer Umschaltung entfernt oder isoliert werden. Der ursprüngliche Anlass für den RDS-Schlüsselzugriffsverlust ist weiterhin ungeklärt. **Keine automatische Produktionsumschaltung.**

Kosten: Der Restore ist kostenpflichtig; Grundkosten ca. 0,55 USD je 24 Stunden bzw. 16,61 USD je 730 Stunden, zusätzlich gegebenenfalls Steuern, Backup-/Transfer-/CPU-Credit-/ECS-/Bedrock-Kosten. Kein automatischer Löschauftrag erteilt; Speicher wird auch bei gestoppter Instanz weiter berechnet. [Kalkulation und Quellen](AWS_RDS_RECOVERY_PLAN_2026-09-13.md)
