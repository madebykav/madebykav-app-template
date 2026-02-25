#!/usr/bin/env bash
set -e

echo "=== MadeByKav App Dev Setup ==="

# Check for .env.local -- required for DATABASE_URL
if [ ! -f .env.local ]; then
  echo "No .env.local found. Copying from .env.example..."
  cp .env.example .env.local
  echo "Created .env.local -- review and update values if needed."
fi

# Start local postgres via docker compose
echo "Starting PostgreSQL..."
docker compose --profile dev up -d

echo "Waiting for PostgreSQL to be ready..."
until docker compose exec postgres pg_isready -U devuser -d app_dev > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL is ready."

# Push schema to local database (creates tables + RLS policies)
echo "Pushing database schema..."
pnpm db:push

echo "Starting Next.js dev server..."
exec pnpm dev
