# Julia Kochstudio

Ein Rezeptbuch für das iPad mit Bildkacheln, Wochenplan und abhakbaren Einkaufslisten. Für den Besuch genügt ein Browser. Der Webspace liefert HTML, CSS, JavaScript und Bilder aus.

## Auf STRATO veröffentlichen

1. Einen eigenen Website-Ordner für das Kochstudio wählen, zum Beispiel `/kochen/web`. Die Subdomain `kochen.babylkw.de` per interner Weiterleitung diesem Ordner zuordnen und HTTPS aktivieren. Der Website-Ordner soll öffentlich lesbar sein.
2. Für den direkten Upload das fertige STRATO-ZIP entpacken und dessen Inhalt in den Zielordner kopieren. Die `index.html` liegt direkt im Zielordner. Auf dem Webspace sind keine weiteren Installationsschritte erforderlich.
3. Für automatische Updates aus GitHub im Repository **Settings → Secrets and variables → Actions** die SFTP-Verbindung hinterlegen. Die Zugangsdaten dienen nur der Veröffentlichung.

| GitHub-Einstellung | Wert |
| --- | --- |
| Secret `STRATO_SFTP_PASSWORD` | Passwort des SFTP-Zugangs |
| Variable `STRATO_SFTP_HOST` | SFTP-Hostname aus dem STRATO-Kundenbereich |
| Variable `STRATO_SFTP_USER` | Benutzer des SFTP-Zugangs |
| Variable `STRATO_SFTP_TARGET` | `/kochen/web` oder `/web`, falls der Zugang bereits im Ordner `kochen` startet |
| Variable `STRATO_SFTP_KNOWN_HOSTS` | Geprüfte OpenSSH-known_hosts-Zeile zum Servernamen |

Bei einem bereits geprüften und im Mac-Terminal gespeicherten SSH-Server zeigt `ssh-keygen -F DEIN-STRATO-HOST -f ~/.ssh/known_hosts` den Eintrag an. Die Zeile mit Hostname, Schlüsseltyp und Schlüssel in GitHub eintragen. Für einen neuen Eintrag den Fingerabdruck bei STRATO prüfen. Im STRATO-Kundenbereich stehen die SFTP-Daten unter **Datenbanken und Webspace → SFTP & SSH**.

Bei Änderungen auf `main` erstellt GitHub die Seite. Sind die SFTP-Daten eingerichtet, lädt der Workflow das Ergebnis in den Kochstudio-Ordner. Nach dem Einrichten kann er unter **Actions → Julia Kochstudio auf STRATO → Run workflow** erneut gestartet werden. Für einen lokalen Build mit Node.js 24 `npm ci` und `npm run build` ausführen. Das Ergebnis steht in `dist/`.

## Gemeinsame Rezepte und eigenes Kochbuch

- Die gemeinsamen Rezepte stehen in `daten/rezepte.json`. Jede Rezept-ID muss eindeutig sein und für spätere Wochenpläne stabil bleiben. Die Bilder liegen in `web/bilder/`. Die acht vorhandenen Gerichte zeigen das Format. Änderungen im GitHub-Repository werden nach erfolgreicher Veröffentlichung für alle Geräte sichtbar.
- Auf dem iPad lassen sich unter **Rezept hinzufügen** Texte aus ChatGPT oder Gemini sowie ein Gerichtfoto einfügen. Eigene Rezepte, Favoriten, Wochenpläne und Einkaufshäkchen speichert das Kochbuch in Safari auf diesem Gerät. Für dauerhaftes Speichern ein normales Browserfenster verwenden.
- Für ein zweites Gerät oder vor dem Löschen der Browserdaten unten **Kochbuch sichern oder übertragen** wählen. Sicherung als JSON-Datei herunterladen und auf dem anderen Gerät über dieselbe Schaltfläche einlesen. Das Zusammenführen ergänzt fehlende Einträge. Bestehende Einträge mit derselben ID behalten die auf dem Zielgerät gespeicherte Fassung.
- Ein Auftrag an ChatGPT, ein Rezept im GitHub-Repository zu ergänzen, kann das Gericht für alle veröffentlichen. Ein direkt auf dem iPad eingefügtes Rezept ist zunächst nur auf diesem Gerät sichtbar.

[STRATO – interne Weiterleitung](https://www.strato.de/faq/domains/alles-zur-domainumleitung/) · [STRATO – SFTP](https://www.strato.de/faq/hosting/so-verbinden-sie-sich-mit-dem-strato-sftp-server/)
