#!/bin/sh

# Run this script once per Railway deployment, before the application starts.
# Neon pooler URLs keep database sessions alive. Prisma's session-level
# advisory lock can then survive a terminated container, so migrations use a
# direct Neon URL and disable that redundant lock. Railway runs this command as
# one pre-deploy job, which provides the required serialization.
set -eu

migration_database_url="${DIRECT_DATABASE_URL:-${DIRECT_URL:-${DATABASE_URL:-}}}"

if [ -z "$migration_database_url" ]; then
  echo "DATABASE_URL must be configured to run migrations." >&2
  exit 1
fi

# Fall back to Neon’s direct hostname when only its pooled URL is configured.
# An explicit DIRECT_DATABASE_URL or DIRECT_URL always takes precedence.
case "$migration_database_url" in
  *-pooler.*)
    migration_database_url=$(printf '%s' "$migration_database_url" | sed 's/-pooler\././')
    ;;
esac

export DATABASE_URL="$migration_database_url"
export PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1

exec ./node_modules/.bin/prisma migrate deploy
