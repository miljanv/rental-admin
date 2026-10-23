#!/bin/sh
# Railway pre-deploy is the primary migration step. Run the same idempotent
# Prisma command at startup as a safety net too: a service can be configured
# with a different config file, in which case Railway otherwise starts code
# that expects a schema it never migrated. Set this to false only when an
# environment deliberately manages migrations elsewhere.
set -e

if [ "${RUN_MIGRATIONS_ON_START:-true}" = "true" ]; then
  echo "Applying database migrations..."
  cd /app/apps/api
  ./scripts/migrate-production.sh
  cd /app
  echo "Migrations applied."
else
  echo "Skipping migrations because RUN_MIGRATIONS_ON_START=false."
fi

exec "$@"
