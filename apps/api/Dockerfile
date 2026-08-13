# Build context is the REPOSITORY ROOT, not apps/api, because the API depends on
# the pnpm workspace packages. On Railway set the service root directory to "/"
# and the Dockerfile path to "apps/api/Dockerfile".
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# The Prisma runtime client is pure WASM, but the CLI's migration (schema)
# engine is a native binary that links against OpenSSL.
RUN apk add --no-cache openssl && corepack enable
WORKDIR /app

# ---------------------------------------------------------------------------
# Dependencies + build
# ---------------------------------------------------------------------------
FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/api ./apps/api

# `prisma generate` must run during the build: Prisma 7 has no postinstall hook
# and the generated client is part of the TypeScript source tree.
RUN pnpm --filter @rental-admin/shared build \
  && pnpm --filter @rental-admin/api build

# ---------------------------------------------------------------------------
# Production image
# ---------------------------------------------------------------------------
FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=4000

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Only production dependencies. Prisma 7 ships a WASM query compiler, so no
# engine binaries, OpenSSL packages or musl-specific builds are required.
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist

# Needed by `prisma migrate deploy` at container start.
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
RUN chmod +x ./apps/api/docker-entrypoint.sh

USER node
EXPOSE 4000

ENTRYPOINT ["./apps/api/docker-entrypoint.sh"]
CMD ["node", "apps/api/dist/server.js"]
