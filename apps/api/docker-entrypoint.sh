#!/bin/sh
# Railway applies pending migrations once in its pre-deploy step. Keeping that
# work out of the runtime container prevents overlapping deploy/restart
# attempts from contending for Prisma's PostgreSQL advisory lock.
#
# Set RUN_MIGRATIONS_ON_START=true only for an environment that has no
# pre-deploy step (for example, an explicitly configured local Docker setup).
set -e

if [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
  echo "Applying database migrations..."
  cd /app/apps/api
  ./scripts/migrate-production.sh
  cd /app
  echo "Migrations applied."
else
  echo "Skipping migrations; they are handled by Railway pre-deploy."
fi

exec "$@"
