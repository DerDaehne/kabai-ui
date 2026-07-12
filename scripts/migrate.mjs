#!/usr/bin/env node
// Kabai UI — migration runner (Node, no psql required)
//
// Applies every migrations/V*.sql in numeric version order (V10 after V9)
// exactly ONCE, recording applied versions in the schema_migrations table.
// Re-runs are therefore always safe — regardless of whether an individual
// migration file is idempotent on its own (V3/V6 are not: CREATE TRIGGER
// without a DROP guard).
//
// The V*.sql files are unmodified copies from the kabai backend repo
// (migrations/ in https://codeberg.org/danszek/kb.ai) — never edit them
// here; update them only via the sync process (see README, "Database
// schema").
//
// Invocation contexts:
//   1. Container start: the Docker image runs this before the app server,
//      so starting a new image is all it takes to bring the configured
//      database up to date.
//   2. Host / external database: `npm run migrate` with KABAI_DB_* set
//      (e.g. `set -a; . ./.env; set +a`).
//
// Credentials: KABAI_DB_USER / KABAI_DB_PASSWORD. If they are not set,
// migrations are SKIPPED with a warning and the process exits 0 — for
// setups where the database schema is managed externally. A failed
// migration exits non-zero so the app does not start against a broken
// or half-migrated schema.
//
// Options:
//   --baseline VN   For an existing database that predates this runner
//                   (no schema_migrations table): marks V1..VN as applied
//                   WITHOUT executing them. Run once, then use normal runs.
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const MIGRATIONS_DIR =
	process.env.MIGRATIONS_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

let baseline = '';
const args = process.argv.slice(2);
if (args[0] === '--baseline') {
	baseline = args[1] || '';
	if (!/^V\d+$/.test(baseline)) {
		console.error('--baseline requires a version, e.g. --baseline V9');
		process.exit(1);
	}
}

const user = process.env.KABAI_DB_USER;
const password = process.env.KABAI_DB_PASSWORD;

if (!user || !password) {
	console.warn(
		'[migrate] WARNING: KABAI_DB_USER/KABAI_DB_PASSWORD not set — skipping database migrations.\n' +
			'[migrate] Set both variables if Kabai UI should manage the schema (recommended).'
	);
	process.exit(0);
}

const sql = postgres({
	host: process.env.KABAI_DB_HOST || 'localhost',
	port: parseInt(process.env.KABAI_DB_PORT || '5432'),
	database: process.env.KABAI_DB_NAME || 'kabai',
	username: user,
	password,
	max: 1,
	onnotice: () => {},
	ssl: process.env.KABAI_DB_SSL === 'true' ? 'require' : undefined
});

// Numeric version sort over basenames (V10 correctly sorts after V9)
const files = readdirSync(MIGRATIONS_DIR)
	.filter((f) => /^V\d+__.*\.sql$/.test(f))
	.sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

try {
	await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
		version    TEXT PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`;

	const appliedRows = await sql`SELECT version FROM schema_migrations`;
	const alreadyApplied = new Set(appliedRows.map((r) => r.version));

	let applied = 0;
	let skipped = 0;

	for (const file of files) {
		const version = file.split('__')[0];

		if (alreadyApplied.has(version)) {
			skipped++;
			continue;
		}

		if (baseline) {
			// Mark as applied without executing — up to and including the baseline
			await sql`INSERT INTO schema_migrations (version) VALUES (${version})`;
			console.log(`[migrate] baseline  ${version} (${file})`);
			applied++;
			if (version === baseline) break;
			continue;
		}

		console.log(`[migrate] applying  ${version} (${file})`);
		// Migration + version record in ONE transaction
		await sql.begin(async (tx) => {
			await tx.file(join(MIGRATIONS_DIR, file));
			await tx`INSERT INTO schema_migrations (version) VALUES (${version})`;
		});
		applied++;
	}

	console.log(`[migrate] Done: ${applied} applied, ${skipped} skipped (already up to date).`);
} catch (err) {
	console.error(`[migrate] FAILED: ${err.message}`);
	console.error('[migrate] Not starting with a broken or half-migrated schema.');
	process.exitCode = 1;
} finally {
	await sql.end({ timeout: 5 });
}
