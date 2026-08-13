#!/bin/sh
# Applies pending migrations before the server starts accepting traffic.
#
# `prisma migrate deploy` is the only migration command that is safe in
# production: it never resets data and never generates new migrations
# (unlike `prisma db push` or `prisma migrate dev`).
#
# Set RUN_MIGRATIONS_ON_START=false to run migrations from a separate release
# step instead.
set -e

if [ "${RUN_MIGRATIONS_ON_START:-true}" = "true" ]; then
  echo "Applying database migrations..."
  cd /app/apps/api
  ./node_modules/.bin/prisma migrate deploy
  cd /app
  echo "Migrations applied."
else
  echo "Skipping migrations (RUN_MIGRATIONS_ON_START=false)."
fi

exec "$@"
