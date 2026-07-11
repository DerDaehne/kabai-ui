# Releases

A release is created exclusively by pushing a git tag in the format
`vMAJOR.MINOR.PATCH` (e.g. `v1.2.0`) to `main`. This triggers
`.forgejo/workflows/release.yml`, which builds an OCI image (via kaniko,
daemon-less) and publishes it to `codeberg.org/danszek/kabai-ui:<version>`
and `:latest`.

```bash
git tag v1.2.0
git push origin v1.2.0
```

## When is a new release justified?

There is no fixed cadence (no "every Friday" or similar). A release is
warranted when **all** of the following hold:

- Since the last tag, at least one user-visible change has landed on `main`
  (new feature, bugfix, security fix) — pure refactorings, documentation, or
  CI changes do not justify a release on their own.
- `main` builds cleanly (`npm run build`) and `svelte-check` shows no new
  errors.
- There are no open tickets marked critical on the board that affect the
  current state of `main`.
- The migration files in `migrations/` are consistent with the schema that
  `main` actually expects (no half-merged DB change).

An AI agent that considers these criteria met may tag and push on its own —
no human sign-off is required for that. When in doubt (e.g. unclear whether a
change is breaking), move the ticket to `human_intervention` and ask the
question in a comment instead of guessing.

## Versioning scheme

Based on SemVer:

- **PATCH** (`v1.2.3` → `v1.2.4`): bugfixes, small UI corrections, no schema
  changes.
- **MINOR** (`v1.2.x` → `v1.3.0`): new features, new optional DB migrations
  (`migrations/Vx__*.sql`), backwards compatible.
- **MAJOR** (`v1.x.x` → `v2.0.0`): breaking changes — e.g. a migration that
  is not backwards compatible without manual intervention, or removed
  environment variables.

## Prerequisite (one-time, by a human)

The repo secret `CODEBERG_TOKEN` must be set: a Codeberg personal access
token with the `write:package` scope. Without this secret the pipeline's
login step fails — no agent can set this up itself, as it requires access to
the Codeberg repo settings.
