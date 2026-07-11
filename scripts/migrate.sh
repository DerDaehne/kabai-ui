#!/bin/sh
# Kabai UI — Migrations-Runner
#
# Wendet alle migrations/V*.sql in Versionsreihenfolge (numerisch, also auch
# V10 nach V9) genau EINMAL an und protokolliert sie in der Tabelle
# schema_migrations. Re-Runs sind damit immer fehlerfrei — unabhängig davon,
# ob eine einzelne Migration selbst idempotent ist (V3/V6 sind es z.B. nicht:
# CREATE TRIGGER ohne DROP-Guard).
#
# Die V*.sql sind unveränderte Kopien aus dem kabai-Backend-Repo
# (migrations/ in https://codeberg.org/danszek/kb.ai) — niemals hier editieren,
# nur per Sync-Prozess aktualisieren (siehe README "Datenbankschema").
#
# Aufrufkontexte:
#   1. docker-entrypoint-initdb.d (erster Start des Postgres-Containers):
#      läuft als Superuser über den lokalen Socket; POSTGRES_USER/POSTGRES_DB
#      sind gesetzt, KABAI_DB_HOST nicht.
#   2. Host/Upgrade: KABAI_DB_* Umgebungsvariablen setzen (z.B.
#      `set -a; . ./.env; set +a`), dann `scripts/migrate.sh`.
#
# Optionen:
#   --baseline VN   Bestands-DB ohne schema_migrations-Tabelle: markiert
#                   V1..VN als bereits angewendet, ohne sie auszuführen.
#                   Einmalig nötig, wenn die DB vor Einführung des Runners
#                   aufgesetzt wurde (z.B. --baseline V9 bei einer DB auf
#                   V9-Stand). Danach normale Runs.
set -eu

MIGRATIONS_DIR="${MIGRATIONS_DIR:-$(dirname "$0")/../migrations}"

BASELINE=""
if [ "${1:-}" = "--baseline" ]; then
    BASELINE="${2:?--baseline braucht eine Version, z.B. V9}"
fi

# Verbindungsart bestimmen (siehe Aufrufkontexte oben)
if [ -n "${KABAI_DB_HOST:-}" ]; then
    export PGPASSWORD="${KABAI_DB_PASSWORD:-}"
    psql_cmd() {
        psql -h "$KABAI_DB_HOST" -p "${KABAI_DB_PORT:-5432}" \
            -U "${KABAI_DB_USER:-kb_user}" -d "${KABAI_DB_NAME:-kabai}" \
            -v ON_ERROR_STOP=1 -qtA "$@"
    }
elif [ -n "${POSTGRES_USER:-}" ]; then
    psql_cmd() {
        psql -U "$POSTGRES_USER" -d "${POSTGRES_DB:-$POSTGRES_USER}" \
            -v ON_ERROR_STOP=1 -qtA "$@"
    }
else
    echo "FEHLER: weder KABAI_DB_HOST (Host-Modus) noch POSTGRES_USER (Container-Init) gesetzt." >&2
    echo "Host-Modus: set -a; . ./.env; set +a; scripts/migrate.sh" >&2
    exit 1
fi

psql_cmd -c "CREATE TABLE IF NOT EXISTS schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);" >/dev/null

applied=0
skipped=0
# Numerische Versionssortierung über den Basename (busybox-kompatibel,
# kein sort -V nötig; V10 kommt korrekt nach V9)
for base in $(ls "$MIGRATIONS_DIR" | grep '^V[0-9][0-9]*__.*\.sql$' | sort -t V -k 2 -n); do
    f="$MIGRATIONS_DIR/$base"
    version=$(basename "$f" | sed 's/__.*//')

    if [ "$(psql_cmd -c "SELECT 1 FROM schema_migrations WHERE version = '$version'")" = "1" ]; then
        skipped=$((skipped + 1))
        continue
    fi

    if [ -n "$BASELINE" ]; then
        # Nur als angewendet markieren, nicht ausführen — bis einschl. BASELINE
        psql_cmd -c "INSERT INTO schema_migrations (version) VALUES ('$version')" >/dev/null
        echo "baseline  $version ($(basename "$f"))"
        applied=$((applied + 1))
        [ "$version" = "$BASELINE" ] && break
        continue
    fi

    echo "migrate   $version ($(basename "$f"))"
    # -1: Migration + Versionseintrag in EINER Transaktion
    psql_cmd -1 -f "$f" -c "INSERT INTO schema_migrations (version) VALUES ('$version')" >/dev/null
    applied=$((applied + 1))
done

echo "Fertig: $applied angewendet, $skipped übersprungen (bereits aktuell)."
