#!/bin/sh
# Kabai UI — migration runner
#
# Applies every migrations/V*.sql in numeric version order (V10 after V9)
# exactly ONCE, recording applied versions in the schema_migrations table.
# Re-runs are therefore always safe — regardless of whether an individual
# migration file is idempotent on its own (V3/V6 are not: CREATE TRIGGER
# without a DROP guard).
#
# The V*.sql files are unmodified copies from the kabai backend repo
# (migrations/ in https://codeberg.org/danszek/kb.ai) — never edit them
# here; update them only via the sync process (see README, "Database
# schema").
#
# Invocation contexts:
#   1. docker compose: the `migrate` service runs this on every
#      `docker compose up` before the app starts (KABAI_DB_* provided
#      by the compose file).
#   2. Host / external database: set the KABAI_DB_* environment variables
#      (e.g. `set -a; . ./.env; set +a`), then run `scripts/migrate.sh`.
#
# Options:
#   --baseline VN   For an existing database that predates this runner
#                   (no schema_migrations table): marks V1..VN as applied
#                   WITHOUT executing them. Run once (e.g. --baseline V6
#                   for a database whose schema is at V6), then use normal
#                   runs from there on.
set -eu

MIGRATIONS_DIR="${MIGRATIONS_DIR:-$(dirname "$0")/../migrations}"

BASELINE=""
if [ "${1:-}" = "--baseline" ]; then
    BASELINE="${2:?--baseline requires a version, e.g. V9}"
fi

if [ -z "${KABAI_DB_HOST:-}" ]; then
    echo "ERROR: KABAI_DB_HOST is not set." >&2
    echo "Load your configuration first: set -a; . ./.env; set +a; scripts/migrate.sh" >&2
    exit 1
fi

export PGPASSWORD="${KABAI_DB_PASSWORD:-}"
psql_cmd() {
    psql -h "$KABAI_DB_HOST" -p "${KABAI_DB_PORT:-5432}" \
        -U "${KABAI_DB_USER:-kb_user}" -d "${KABAI_DB_NAME:-kabai}" \
        -v ON_ERROR_STOP=1 -qtA "$@"
}

psql_cmd -c "CREATE TABLE IF NOT EXISTS schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);" >/dev/null

applied=0
skipped=0
# Numeric version sort over basenames (busybox-compatible, no sort -V
# needed; V10 correctly sorts after V9)
for base in $(ls "$MIGRATIONS_DIR" | grep '^V[0-9][0-9]*__.*\.sql$' | sort -t V -k 2 -n); do
    f="$MIGRATIONS_DIR/$base"
    version=$(basename "$f" | sed 's/__.*//')

    if [ "$(psql_cmd -c "SELECT 1 FROM schema_migrations WHERE version = '$version'")" = "1" ]; then
        skipped=$((skipped + 1))
        continue
    fi

    if [ -n "$BASELINE" ]; then
        # Mark as applied without executing — up to and including BASELINE
        psql_cmd -c "INSERT INTO schema_migrations (version) VALUES ('$version')" >/dev/null
        echo "baseline  $version ($(basename "$f"))"
        applied=$((applied + 1))
        [ "$version" = "$BASELINE" ] && break
        continue
    fi

    echo "migrate   $version ($(basename "$f"))"
    # -1: migration + version record in ONE transaction
    psql_cmd -1 -f "$f" -c "INSERT INTO schema_migrations (version) VALUES ('$version')" >/dev/null
    applied=$((applied + 1))
done

echo "Done: $applied applied, $skipped skipped (already up to date)."
