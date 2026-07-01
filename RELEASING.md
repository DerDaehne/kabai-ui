# Releases

Ein Release entsteht ausschließlich durch einen Git-Tag im Format `vMAJOR.MINOR.PATCH`
(z.B. `v1.2.0`), gepusht nach `main`. Das löst `.forgejo/workflows/release.yml` aus,
das ein Docker-Image baut und nach `codeberg.org/danszek/kbai-ui:<version>` sowie
`:latest` published.

```bash
git tag v1.2.0
git push origin v1.2.0
```

## Wann ist ein neues Release gerechtfertigt?

Es gibt keine feste Kadenz (kein "jeden Freitag" o.ä.). Ein Release lohnt sich, wenn
**alle** der folgenden Punkte zutreffen:

- Seit dem letzten Tag ist mindestens eine für Nutzer sichtbare Änderung auf `main`
  gelandet (neues Feature, Bugfix, Sicherheitsfix) — reine Refactorings, Doku- oder
  CI-Änderungen rechtfertigen für sich allein kein Release.
- `main` baut sauber (`npm run build`) und `svelte-check` zeigt keine neuen Fehler.
- Es gibt keine offenen, als kritisch markierten Tickets im Board, die den aktuellen
  Stand von `main` betreffen.
- Migrationsdateien in `init-db/` sind konsistent mit dem tatsächlichen Schema, das
  `main` erwartet (kein halb gemergter DB-Change).

Ein KI-Agent, der diese Kriterien für erfüllt hält, darf eigenständig taggen und
pushen — dafür ist keine Rückfrage beim Menschen nötig. Bei Unsicherheit (z.B.
unklar, ob eine Änderung breaking ist) das Ticket stattdessen nach
`human_intervention` verschieben und die Frage im Kommentar stellen, statt zu raten.

## Versionsschema

Angelehnt an SemVer:

- **PATCH** (`v1.2.3` → `v1.2.4`): Bugfixes, kleine UI-Korrekturen, keine
  Schema-Änderungen.
- **MINOR** (`v1.2.x` → `v1.3.0`): Neue Features, neue optionale DB-Migrationen
  (`init-db/Vx__*.sql`), abwärtskompatibel.
- **MAJOR** (`v1.x.x` → `v2.0.0`): Breaking Changes — z.B. eine Migration, die ohne
  manuellen Eingriff nicht abwärtskompatibel ist, oder entfernte Umgebungsvariablen.

## Voraussetzung (einmalig, durch einen Menschen)

Das Repo-Secret `CODEBERG_TOKEN` muss gesetzt sein: ein Codeberg-Personal-Access-Token
mit `write:package`-Scope. Ohne dieses Secret schlägt der Login-Schritt der Pipeline
fehl — das kann kein Agent selbst einrichten, da es Zugriff auf die Codeberg-
Repo-Settings erfordert.
