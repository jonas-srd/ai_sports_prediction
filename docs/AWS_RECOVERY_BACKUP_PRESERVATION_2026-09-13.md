# Sicherung des logischen Wiederherstellungsexports

Stand: **13.09.2026, nach erfolgreicher S3-Kopie um 16:12 MESZ**. Auf ausdrückliche Freigabe zur Sicherung und Test-Wiederherstellung wurde der vorhandene Export als **private lokale Kopie und private serverseitige S3-Kopie außerhalb der geltenden Ablaufregel** gesichert. Das Original in S3 wurde nicht verändert; keine Produktionsverbindung wurde umgestellt.

## Gesicherte Quelle und Nachweis

| Merkmal | Verifiziert |
| --- | --- |
| AWS-Konto / Region | `186581960948` / `eu-central-1` |
| Bucket | `ai-sports-prediction` |
| Quellschlüssel | `ai-sports-prediction/backups/postgres-logical-2026-08-26T00-00-27-416Z.jsonl.gz` |
| Exakte Quellversion | `yQJE50dNJ.1DtRhJiF_WSd80JjLi.hcb` |
| Quelländerungsdatum | `2026-08-26T00:00:29Z` |
| Größe | 3.073.635 Bytes |
| Quellverschlüsselung | AES256 / SSE-S3 |
| ETag | `2b143db23e8e3a58b299e0ce45abcc1c` |
| SHA-256 der lokalen Datei | `1f5058bfa4b99cd608485ed5a0c0c5c852ad6e092dbc45da758ea0fadae08332` |
| CRC32 der vollständigen lokalen Datei, Base64 | `luqnWg==`; identisch zur S3-Prüfsumme der Sicherungskopie |
| Vollständige Formatprüfung | gzip erfolgreich entpackt; alle JSONL-Einträge als Tabellen-/Zeilenobjekte validiert |
| Umfang | 28.984 Datensätze in 17 im Export enthaltenen Tabellen |

Der Download nutzte das lesbare aktuelle Objekt mit `If-Match` auf den zuvor geprüften ETag. Sowohl der vorherige `HeadObject`-Aufruf als auch die tatsächliche `GetObject`-Antwort bestätigten **genau die oben angegebene Version** und Größe. Der lokale MD5-Wert stimmt zusätzlich mit dem ETag dieses konkreten Objekts überein. Der SHA-256-Wert wurde über die vollständige komprimierte lokale Datei berechnet; er ist kein separat aus S3 gelesener SHA-256-Wert.

## Lokaler Ablageort und Schutz

```text
/Users/jonasschroder/Desktop/ai_sports_prediction/exports/recovery-preserved/2026-09-13/
  postgres-logical-2026-08-26T00-00-27-416Z.jsonl.gz
  manifest.json
```

- Beide Verzeichnisse unter `exports/recovery-preserved` haben Modus `0700`, Export und Manifest `0600`.
- `git check-ignore` bestätigt, dass der Export von der vorhandenen `exports/`-Regel in `.gitignore` erfasst wird.
- Das datierte Zielverzeichnis wurde exklusiv neu erstellt; bei vorhandenem Ziel hätte die Sicherung abgebrochen. Es wurde keine vorhandene Datei überschrieben.
- Das private Manifest enthält die Objektmetadaten, Prüfsumme und aggregierte Tabellenzählungen, keine exportierten Zeilen oder Zugangsdaten. Die entpackten Zeilen wurden nicht als weitere Datei gespeichert und nicht ausgegeben.
- Die lokale Datei unterliegt nicht den S3-Lifecycle-Regeln und bleibt als zusätzliche Sicherung erhalten. Die nachfolgend dokumentierte entfernte Kopie besteht ebenfalls. Eine lokale Datenträgerverschlüsselung wurde nicht geprüft oder zugesichert.

## Private S3-Kopie außerhalb der Ablaufregel

Die bereits angemeldete, berechtigte Konsolenidentität `jonas_sdr` führte die Kopie im bestehenden Konto durch. Die Konsole meldete **ein kopiertes Objekt, 2,9 MB, null Fehler**. Vor der Kopie zeigte die Bucket-Wurzel nur das vorhandene Präfix `ai-sports-prediction/`; `recovery-preserved/` war noch nicht vorhanden. Es wurde kein bestehendes Ziel überschrieben.

| Merkmal der Sicherungskopie | In der AWS-Konsole verifiziert |
| --- | --- |
| Bucket | `ai-sports-prediction` |
| Vollständiger Zielschlüssel | `recovery-preserved/2026-09-13/ai-sports-prediction/backups/postgres-logical-2026-08-26T00-00-27-416Z.jsonl.gz` |
| VersionId | `H4J6RnnVkJd2PDgozPREobSZ8q_.pZHQ` – aktuelle und einzige Zielversion |
| Erstellung | 13.09.2026, 16:12:02 MESZ |
| ETag | `2b143db23e8e3a58b299e0ce45abcc1c` – identisch zur Quelle |
| CRC32 / Prüfsummentyp | `luqnWg==` / `FULL_OBJECT` |
| Verschlüsselung | SSE-S3 |
| Ablaufregel / Ablaufdatum | Jeweils `–`, kein Ablauf für dieses Objekt angezeigt |
| Bucket-Versionierung | Aktiviert |
| Öffentlichen Zugriff vollständig blockieren | Aktiviert |
| Object Ownership / ACLs | `BucketOwnerEnforced`; ACLs deaktiviert |

Die S3-Konsole behielt beim Kopieren den vollständigen Quellpfad unter dem neuen Präfix bei; der Zielschlüssel ist deshalb länger als der zunächst vorgeschlagene Dateiname direkt im datierten Präfix. Der vollständige lokale Export wurde zusätzlich unabhängig mit CRC32 berechnet: **`luqnWg==` stimmt mit der `FULL_OBJECT`-Prüfsumme der Remote-Kopie überein.** Zusammen mit übereinstimmendem ETag und erfolgreichem S3-Kopierergebnis ist damit die Inhaltsgleichheit zur exakt verifizierten lokalen Quellversion geprüft. Die neue Remote-Version wurde nicht nochmals heruntergeladen; ein SHA-256-Wert dieser Remote-Version wurde nicht separat aus S3 gelesen.

Die aktuelle Lifecycle-Regel erfasst nur Schlüssel, die mit `ai-sports-prediction/backups/` beginnen. Der Zielschlüssel beginnt mit `recovery-preserved/` und fällt daher nicht darunter. Dies ist **kein unveränderlicher Object-Lock-Schutz**: Spätere Regeländerungen oder Löschaktionen wären weiterhin gesondert zu vermeiden. Keine Lifecycle-Regel, Bucket-Policy, ACL, Verschlüsselungs- oder Versionierungseinstellung wurde geändert.

## S3-Ablauf und Grenze der vorhandenen Berechtigungen

Die gelesene Bucket-Lifecycle-Konfiguration enthält genau eine aktivierte Regel: `verified-logical-backup-retention`, Ablauf nach 35 Tagen, Filterpräfix `ai-sports-prediction/backups/`. Die Quelle meldet weiterhin **01.10.2026, 00:00 UTC** als Ablaufdatum.

Das geprüfte Remote-Zielpräfix `recovery-preserved/2026-09-13/` fällt nicht unter diese Regel. Die lokale CLI-Identität `ai-sports-prediction-deploy-local` konnte die notwendigen Nachweise und die Kopieroperation nicht vollständig ausführen; deshalb erfolgte die oben dokumentierte Remote-Kopie anschließend über die bereits berechtigte AWS-Konsole:

- Direkter Zugriff auf eine explizite `VersionId` wurde verweigert (`s3:GetObjectVersion`). Der oben beschriebene bedingte aktuelle Download bestätigte die exakte Version trotzdem erfolgreich.
- `ListObjectsV2` auf dem Zielpräfix sowie `HeadObject` des geplanten Zielschlüssels wurden verweigert. Ein nicht vorhandenes Ziel lässt sich mit dieser CLI-Identität nicht sicher nachweisen; die Konsolenprüfung bestätigte den noch nicht vorhandenen Zielpräfix.
- `s3:GetBucketPublicAccessBlock` wurde per CLI verweigert. Der bestehende private Remote-Zugriffsschutz wurde anschließend in der Konsole verifiziert.
- Die gelesenen Backup-/Operations-Inline-Policies erlauben Objektlesen nur im bisherigen Backup-Präfix; sie enthalten kein `s3:PutObject` für das Erhaltungspräfix. Ein CLI-Kopier-/Schreibversuch wurde nicht durchgeführt.

Keine IAM-Rechte, Schlüssel, Bucket-Policies, ACLs oder Lifecycle-Regeln wurden geändert. Weder die lokale Sicherung noch die erfolgreiche Konsolenkopie erforderten eine Rechteerweiterung.

## Abgrenzung

Die Format-/Prüfsummenprüfung belegt einen vollständig lesbaren Export, **nicht** automatisch eine konsistente produktive Wiederherstellung oder einen jüngeren Datenstand. Ein Importer, Fremdschlüssel-/Triggerprüfung und fachliche Datenprüfung sind davon getrennte Aufgaben. RDS-Wiederherstellung und Produktionsfreigabe werden im [Wiederherstellungsplan](AWS_RDS_RECOVERY_PLAN_2026-09-13.md) behandelt.
