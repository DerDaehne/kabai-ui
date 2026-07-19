# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Version für die UI-Anzeige (Ticket #544): der Release-Workflow reicht den
# Tag als Build-Arg herein (.git ist nicht im Build-Kontext, git describe
# geht hier nicht); ohne Arg fällt vite auf "dev" zurück.
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Produktions-Abhängigkeiten ohne devDependencies
RUN npm ci --omit=dev

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Nur das Build-Artefakt und prod-deps übernehmen
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Migrationen + Runner ins Image: ein frisch gestartetes Image hebt die
# konfigurierte DB selbst auf den aktuellen Migrationsstand (kein Repo-
# Checkout, kein separater Migrationsschritt nötig).
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Erst migrieren (No-op wenn aktuell; Abbruch bei Migrationsfehler,
# Warnung+Start ohne KABAI_DB_USER/PASSWORD), dann Server starten.
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node build/index.js"]
