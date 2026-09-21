# Öffentliche Sportseite: Produktionsfreigabe 16.09.2026

Nutzerfreigabe: „Ja, Sportseite freischalten; Geschäftsfunktionen gesperrt lassen“.
Dieser Release ist **keine Freigabe von Kundenkonten, Zahlungen, Newsletter,
automatischem Versand, Social-Publishing oder alten Redis-Queues**.

## Build und Prüfungen

- Basis: Git-Commit `bc4c08cccef11c98a6f535e000baf27490a4bb7d` plus die lokalen,
  geprüften Änderungen an Docker-Build, Web-Geschäftssperren, der neutralen
  Anbieterbeschriftung noch ausstehender Prognosen und Text-Hydrierung. Diese Änderungen
  wurden für den Release nicht automatisch committed oder gepusht.
- Isolierter Quellkontext aus Git-Archiv plus explizit kopierten Web-Änderungen,
  ohne lokale Zugangsdaten. 2.232 Dateien; SHA256 über sortierte relative Pfade
  mit je `Pfad + NUL + Datei-SHA256 + Zeilenumbruch`:
  `712511a30df91ad975d52ba70c1bcecd83a91df89962c044d0441e468dbf89c9`.
- Linux/ARM64-Produktionsimage, 4.889 Seiten erfolgreich gebaut; alle
  Workspace-Typechecks erfolgreich. 88 Web-, 67 Worker/Paket- und 49
  Betriebsskript-Tests bestanden (204 insgesamt).
- ECR-Tag `public-guarded-bc4c08c-20260916-v3`, Digest
  `sha256:603dbe900a6af6a0124ce9deabae394da564dc417a00438b8a9e803fd710acf8`.
  ARM-Manifest: `sha256:a77afb96f5e57849a0db4aed1ad394060ca8b881834ec28b24516a8f22b1b47a`.
  Das zuvor hochgeladene ungeschützte Vollseiten-Image wurde **nicht ausgerollt**.
- `NEXT_PUBLIC_SHOW_FULL_SITE=1` wird vor dem Next-Build gesetzt; der
  Laufzeit-Schalter allein würde clientseitige Navigation nicht zuverlässig
  aktivieren. `SHOW_FULL_SITE=1` gilt zusätzlich im Webcontainer.

## Geschäftssperren

`PUBLIC_BUSINESS_ENABLED` verlangt ausdrücklich den Wert `1`; fehlend oder
jeder andere Wert bedeutet gesperrt. Der Release setzt ihn auf `0`.
19 Routendateien / 20 Handler brechen mit HTTP 503
`business_temporarily_unavailable`, `private, no-store` ab, bevor sie
Authentifizierung, Request-Verarbeitung, Datenbank oder Provider ansprechen.

Abgedeckt sind Newsletter-An-/Abmeldung, Widget-Bestellung/Leads, Kundenkonten,
Login-Token, Stripe-Webhooks, Widget-APIs mit nutzungszählenden GET-Anfragen,
Reddit/TikTok-OAuth und administrative Geschäftsänderungen. Logout bleibt als
reine Cookie-Löschung möglich. Sportdaten und die dedizierte lesende Sport-API
bleiben verfügbar. Die Oberfläche versteckt Newsletter- und Bestellformulare
und zeigt bei Kundenfunktionen einen vorübergehenden Sperrhinweis.

Lokaler Container ohne Produktionszugangsdaten: fünf leere POST-Proben auf
Newsletter, Bestellanforderung, Login-Anforderung, Kundenkonto und Stripe-Webhook
lieferten jeweils den erwarteten 503-Sperrcode. Browserprüfung von Modellwechsel,
EN/DE-Sprachwechsel, Zeitzonenwahl und Sperrhinweisen erfolgreich.

Noch ausstehende Prognosen sind neutral als „AI prediction“ / „KI-Prognose“
beschriftet. Die zuvor hartcodierte OpenRouter-Beschriftung war bei fehlenden
Vorhersagen irreführend; echte gespeicherte Bedrock-/OpenRouter-Provenienz bleibt
unverändert. Eigene Regressionstests prüfen beide Fälle.

Die Browser-Abnahme von V2 fand außerdem React-Hydrierungsfehler in den
echten Prognosekarten: die automatische Übersetzung verdoppelte äußere
Leerzeichen auch bei unverändertem Text. V3 übersetzt nur den inneren Text und
stellt die ursprünglichen Randzeichen genau einmal wieder her. Zwei neue Tests
sichern unveränderte/übersetzte Texte einschließlich geschützter Leerzeichen.
Ein isolierter SSR-Test mit den echten Komponenten und verzögerter
Suspense-Hydrierung reproduzierte vor der Korrektur exakt zwei Fehler. Mit der
Korrektur waren Englisch/NEXUS/UTC sowie Deutsch/PULSE/Berlin fehlerfrei.
Der Testserver ist beendet; er war keine öffentliche Next-Route und ist nicht
im Produktionsimage enthalten. Keine Hydrierungswarnungen wurden unterdrückt.

Eine spätere Geschäftsfreigabe benötigt eigene Wiederherstellungs-/Provider- und
Rechtsprüfungen sowie einen neuen Build. Nicht beiläufig `PUBLIC_BUSINESS_ENABLED`
aktivieren. Das Fehlen von Versand-/Zahlungs-Secrets allein reicht nicht als
Schreibschutz für Newsletter, Leads oder Widget-Nutzungszähler.

## Kontrollierter Rollout

`scripts/deploy-public-production.mjs` plant standardmäßig nur lesend. Apply
verlangt die erwartete aktuelle Taskdefinition, einen Digest aus dem eigenen
ECR-Repository, ein neues geschütztes Nachweisverzeichnis und eine ausdrückliche
Bestätigung der kurzen Unterbrechung.

Die unveränderliche Baseline ist die geprüfte Recovery-Revision 66. Erlaubt sind
ausschließlich neue App-Images, die beiden Vollseiten-Schalter und explizit
deaktivierte Geschäfts-Schalter. Worker-Befehl, Secrets-Allowlist, Datenbankziel,
strenge TLS-Prüfung, Tunnel und alle übrigen Recovery-Einstellungen bleiben
erhalten. Die Zieldefinition wird **vor** dem Stop registriert und geprüft.

Reihenfolge: alte Tasks tatsächlich `STOPPED` → Zielrevision bei Kapazität null
vollständig abgeschlossen → separat einen Task starten. Kein automatischer
Rollback auf alte ungeschützte Revisionen. Der separate Worker bleibt bei null.
SSM-Datenbankparameter bleibt auf Version 2; keine Migration, Secret-Umschaltung,
Bereinigung oder Queue-Reaktivierung gehört zu diesem Rollout.

Normale GitHub-Deployments behalten den Recovery-Preflight. Das zuvor ergänzte
regionale AWS-Leserecht ist aktiv; es ist kein Grund, den Schutz zu entfernen.

## Live-Abnahme

Endgültige Revision `ai-sports-prediction-edge:69`, Task
`b6c40e419cbe4ab78b34a4a120f56e92`, Start 21:59:59.079 UTC. Alle drei
App-Container verwenden den oben genannten V3-Digest; der unveränderte Tunnel
verwendet seinen bisherigen gepinnten Digest. Geschützte, aus Git ausgeschlossene Nachweise:
`exports/public-production/2026-09-16-guarded-v3/`.

Neue echte Prognosen für Quellspiel `2600595` um 22:00:05.286 UTC: NEXUS, PULSE
und EDGE, jeweils `Bedrock / eu.amazon.nova-2-lite-v1:0`, mit drei passenden
gespeicherten Revisionen. Frisches Backup danach:
`postgres-logical-2026-09-16T22-00-05-385Z.jsonl.gz`, 3.364.127 Bytes, SHA256
`d3d92f83f5c332678495e45adb9c67fa7d570467975ada2c8cfae5a036fc2378`.
Download-/temporärer Restore-Audit erfolgreich 22:00:29.163 UTC; kein
vollständiger Fremdschlüssel-Restore-Nachweis. Lesender Prüftask
`d4534693b44d45ccae9df013fc5b3e48` (`cutover-check:9`) beendet mit Exitcode 0,
sämtliche Integritäts-/Migrationsprüfungen erfolgreich. Geschäftsdaten-Aggregat
unverändert: keine Widget-Kunden/Login-Token/aktiven Social-Verbindungen,
ein Newsletter-Abonnent und ein nicht versandter Empfänger bleiben gesperrt.

Der erste öffentliche Rollout auf Revision 67 wurde um 21:33 UTC erfolgreich
abgenommen: vier Container, drei neue echte Bedrock-Prognosen mit passenden
Revisionen und frisches geprüftes Backup. Rein lesender Prüftask
`e8e156c3479c4c109b4bb7491d26bab0` (`cutover-check:7`) Exitcode 0: 21 Migrationen,
37 Fremdschlüssel, 66 Check-Constraints und drei Trigger ohne Verstöße;
keine synthetischen Datensätze. Nachweise unter
`exports/public-production/2026-09-16-guarded/` bleiben erhalten.
V2 (Revision 68) ergänzte die bei der Browser-Abnahme aufgefallene
Anbieterbeschriftung. Die erfolgreiche Backend-/Backup-Abnahme bleibt unter
`exports/public-production/2026-09-16-guarded-v2/` erhalten. Die dabei gefundenen
Browser-Hydrierungsfehler wurden in V3 korrigiert. Live-Browserprüfung von V3:
EN-Startseite mit echten Bedrock-Karten, DE-Startseite nach hartem Neuladen mit
gespeichertem PULSE/CET, Wechsel zu EDGE, NFL-Spieldetail und gesperrter
Kunden-Login ohne neue Konsolenfehler. Ausstehende NBA-Prognose neutral beschriftet.

HTTP-Abnahme von V3 erfolgreich: 16 öffentliche Seiten einschließlich EN/DE,
aller vier Sportarten, Spielübersicht, Analyse, Turnierbaum, Widgets, Rechtstexte,
Robots und Sitemap mit HTTP 200; beide Health-Endpunkte gesund, Datenbankzeit
aktuell, Sport-API mit 564 Spielen und allen drei frisch erzeugten
Bedrock-Profilen. Neun Geschäfts-Endpunkte liefern erwartungsgemäß HTTP 503
`business_temporarily_unavailable` mit `no-store`, ohne Eingaben zu verarbeiten.

Abschlussstatus 22:05:25 UTC (17.09., 00:05 MESZ): genau ein Produktionstask,
ein abgeschlossener ECS-Rollout, vier laufende Container, alte Tasks tatsächlich
gestoppt, separater Worker-Service weiterhin null. Alle fünf Sport-/Backup-Jobs
erfolgreich, keine Worker-Fehler; Redis und Geschäftsjobs deaktiviert. S3-Head
bestätigt Größe und AES256-Verschlüsselung des Backups; Version
`l3HlppBgafXo4_FfFmBAS6ITjwI0h4t0`. `final-passed.json`, `http-passed.json` und
`proof-passed.json` enthalten die geschützten Nachweise.

Bei der finalen Log-Abnahme lieferte CloudWatch zwischenzeitlich eine leere
Ergebnisseite trotz vorhandener Ereignisse. Der temporäre Prüfrunner wurde auf
vollständige, zeitlich begrenzte Vorwärts-Paginierung korrigiert; keine
Produktionskonfiguration wurde dafür verändert. AWS dokumentiert ausdrücklich
[mögliche leere Zwischenseiten](https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_GetLogEvents.html).

## Verbleibende Grenzen

- Die vollständige öffentliche Oberfläche läuft weiterhin mit dem bewusst
  begrenzten Recovery-Worker: ein Spiel im ersten Prognoselauf, anschließend
  höchstens drei Spiele je stündlichem Lauf. Das ist keine Freigabe des alten
  vollständigen Geschäfts-/Queue-Workers.
- Funktionale Stichproben sind kein Lasttest und kein Nachweis statistischer
  Prognosegüte. Manche kalten Tennisaufrufe benötigten rund 18 Sekunden;
  `/nba/matches` lieferte etwa 5 MB HTML und benötigte rund zehn Sekunden.
  Diese bestehenden Payload-/Latenzprobleme wurden hier nicht umgebaut.
- Nicht jede der 4.889 gebauten Routen wurde einzeln im Browser besucht.
- Geschäftsfunktionen sind bewusst nicht freigegeben. Alte Datenbank und
  bestehende Backups bleiben erhalten; ursprünglicher Recovery-Punkt ist
  der 26.08.2026, 06:48:39 UTC. Sportdaten werden seitdem neu synchronisiert;
  dieser Release behauptet keine Wiederherstellung späterer Geschäftsdaten.
  Die Backup-Grenzen aus dem Cutover-Protokoll gelten weiter.
