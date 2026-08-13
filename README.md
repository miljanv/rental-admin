# Rental Admin — file admin panel

A working full-stack admin panel for uploading, listing, downloading and deleting
files. Files live in a **private AWS S3 bucket** and never pass through the API
server: the browser uploads straight to S3 with a short-lived presigned URL, and
the API only stores metadata in PostgreSQL.

There is no authentication in this first version, but the structure is prepared
for it (see [Adding authentication later](#adding-authentication-later)).

## Features

- Dashboard with total file count, total size, files uploaded today and the five
  most recent uploads — all served by the API, no hardcoded values.
- Files page with drag-and-drop, file picker, pre-upload preview (name, size,
  MIME type), real upload progress, cancel/remove, search, sorting, pagination.
- Direct-to-S3 upload using a presigned `PUT` URL, confirmed server-side with
  `HeadObject` before the row is marked as uploaded.
- Download through a presigned `GET` URL valid for at most 5 minutes.
- Delete with a confirmation dialog: the S3 object is removed first, then the
  database row.
- Loading skeletons, empty states, error states with a reload button, and toast
  notifications for every mutation.
- Light/dark theme, fixed desktop sidebar, drawer sidebar on mobile,
  breadcrumbs.

## Tech stack

| Area     | Stack                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui, Lucide, TanStack Query 5, React Hook Form, Zod 4, Axios, Sonner |
| Backend  | Node.js 22, Express 5, TypeScript strict, Prisma 7, PostgreSQL, Zod 4, AWS SDK v3, Helmet, CORS, Morgan, express-rate-limit, dotenv              |
| Storage  | Private AWS S3 bucket, presigned PUT/GET URLs                                                                                                    |
| Tooling  | pnpm workspaces, ESLint 9, Prettier, Vitest                                                                                                      |
| Hosting  | API + PostgreSQL on Railway (Docker), frontend on Vercel                                                                                         |

## Repository layout

```text
rental-admin/
├── apps/
│   ├── api/                          # Express API
│   │   ├── prisma/
│   │   │   ├── migrations/           # 20260813150406_init
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── config/               # env (Zod), prisma + s3 singletons, app-info
│   │   │   ├── controllers/          # thin request handlers
│   │   │   ├── middleware/           # validate-request, error-handler, not-found, rate-limit, request-logger
│   │   │   ├── routes/               # health, dashboard, files, index (/api/v1)
│   │   │   ├── schemas/              # API-level Zod schemas
│   │   │   ├── services/             # file.service, dashboard.service, storage.service (S3)
│   │   │   ├── utils/                # app-error, api-response, async-handler, storage-key, logger, file-mapper
│   │   │   ├── app.ts                # Express app assembly
│   │   │   └── server.ts             # listen + graceful shutdown
│   │   ├── Dockerfile                # multi-stage, build context = repo root
│   │   ├── docker-entrypoint.sh      # prisma migrate deploy, then start
│   │   ├── prisma.config.ts          # Prisma 7 CLI config (datasource url)
│   │   ├── railway.json
│   │   └── .env.example
│   └── web/                          # Next.js frontend
│       ├── src/
│       │   ├── app/                  # /, /files, not-found, layout, globals.css
│       │   ├── components/
│       │   │   ├── common/           # page-header, empty-state, error-state, table-skeleton
│       │   │   ├── layout/           # app-shell, app-header, sidebar, breadcrumbs, theme-toggle
│       │   │   └── ui/               # shadcn/ui primitives
│       │   ├── features/
│       │   │   ├── dashboard/        # api, hooks, components
│       │   │   └── files/            # api, hooks, schemas, components
│       │   ├── lib/                  # api-client, api-error, env, format, query-keys, utils
│       │   ├── providers/            # query-provider, theme-provider
│       │   └── types/
│       └── .env.example
├── packages/
│   ├── shared/                       # constants, Zod schemas and types used by both apps
│   └── typescript-config/            # base / node / nextjs tsconfigs
├── package.json                      # workspace scripts
├── pnpm-workspace.yaml
└── README.md
```

## Architecture

**Upload never touches the API server.** The API is a metadata and policy
service: it validates the request, decides the S3 key, signs a URL, and later
verifies that the object actually arrived.

```text
Browser                        Express API                    PostgreSQL        S3
   │ POST /files/presign-upload     │                              │             │
   │──────────────────────────────►│ validate size + MIME          │             │
   │                                │ build uploads/YYYY/MM/uuid-name             │
   │                                │─── create row (PENDING) ────►│             │
   │                                │ sign PUT URL ─────────────────────────────►│
   │◄── fileId + uploadUrl ─────────│                              │             │
   │ PUT uploadUrl (Axios, onUploadProgress)                       │             │
   │──────────────────────────────────────────────────────────────────────────►│
   │ POST /files/:id/confirm        │                              │             │
   │──────────────────────────────►│ HeadObject ───────────────────────────────►│
   │                                │ re-check size + MIME         │             │
   │                                │─── UPLOADED + uploadedAt ───►│             │
   │◄── file DTO ───────────────────│                              │             │
```

If the S3 `PUT` fails, the row stays `PENDING`; if `confirm` cannot find the
object, the row is set to `FAILED`. The files list only returns `UPLOADED` rows,
so a failed upload can never appear as successful.

Backend layering is strict: `routes → middleware (Zod) → controllers → services
→ (Prisma | S3)`. Controllers only read validated input and send a response;
all business logic lives in services. The frontend mirrors this: presentation
components never call the API directly, they use hooks in
`features/*/hooks` which call `features/*/api`.

### Prisma model

```prisma
enum FileStatus {
  PENDING
  UPLOADED
  FAILED
}

model FileObject {
  id           String     @id @default(cuid())
  originalName String
  storageKey   String     @unique
  mimeType     String
  size         Int
  status       FileStatus @default(PENDING)
  uploadedAt   DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@index([status])
  @@index([createdAt])
}
```

`storageKey` is never sent to the client — the DTO mapper strips it, so the
bucket layout is not exposed.

## Requirements

- Node.js >= 20.9 (22 LTS recommended)
- pnpm 10 (`corepack enable`)
- A PostgreSQL 14+ database
- An AWS account with a private S3 bucket

## Installation

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# fill in DATABASE_URL and the AWS values in apps/api/.env
pnpm db:migrate      # creates the schema and generates the Prisma client
pnpm dev             # API on :4000, web on :3000
```

Open http://localhost:3000.

## Environment variables

### `apps/api/.env`

| Variable                         | Required | Default       | Notes                                                              |
| -------------------------------- | -------- | ------------- | ------------------------------------------------------------------ |
| `NODE_ENV`                       | no       | `development` | `development` \| `test` \| `production`                            |
| `PORT`                           | no       | `4000`        | Railway injects this                                               |
| `DATABASE_URL`                   | **yes**  | —             | PostgreSQL connection string                                       |
| `FRONTEND_URL`                   | **yes**  | —             | Comma-separated allowed browser origins, no trailing slash, no `*` |
| `AWS_REGION`                     | **yes**  | —             | e.g. `eu-central-1`                                                |
| `AWS_S3_BUCKET_NAME`             | **yes**  | —             | Private bucket                                                     |
| `AWS_ACCESS_KEY_ID`              | **yes**  | —             | IAM user key                                                       |
| `AWS_SECRET_ACCESS_KEY`          | **yes**  | —             | IAM user secret                                                    |
| `AWS_S3_ENDPOINT`                | no       | —             | Only for S3-compatible services (MinIO/LocalStack)                 |
| `AWS_S3_FORCE_PATH_STYLE`        | no       | `false`       | Use with a custom endpoint                                         |
| `PRESIGNED_UPLOAD_EXPIRES_IN`    | no       | `300`         | Seconds, max 300                                                   |
| `PRESIGNED_DOWNLOAD_EXPIRES_IN`  | no       | `300`         | Seconds, max 300                                                   |
| `MAX_FILE_SIZE_MB`               | no       | `25`          | Enforced on presign and again on confirm                           |
| `RATE_LIMIT_WINDOW_MINUTES`      | no       | `15`          |                                                                    |
| `RATE_LIMIT_MAX_REQUESTS`        | no       | `300`         | Per IP per window                                                  |
| `RATE_LIMIT_MAX_UPLOAD_REQUESTS` | no       | `60`          | Stricter limit for presign/confirm/delete                          |

Every variable is validated with Zod in `apps/api/src/config/env.ts` at startup.
A missing or malformed value stops the process with a readable message instead of
failing later at runtime.

### `apps/web/.env.local`

| Variable                       | Required | Notes                                              |
| ------------------------------ | -------- | -------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`          | **yes**  | Must include the `/api/v1` prefix                  |
| `NEXT_PUBLIC_APP_ENV`          | no       | Label shown in the sidebar footer                  |
| `NEXT_PUBLIC_APP_VERSION`      | no       | Version badge in the sidebar footer                |
| `NEXT_PUBLIC_MAX_FILE_SIZE_MB` | no       | Client-side limit; the API enforces its own anyway |

Only presentation values are exposed to the browser. No AWS credentials, no
database URL, no secrets are ever read on the client.

## Commands

Run from the repository root:

| Command                  | What it does                                       |
| ------------------------ | -------------------------------------------------- |
| `pnpm dev`               | Builds `shared`, then runs API and web in parallel |
| `pnpm build`             | Production build of `shared`, API and web          |
| `pnpm lint`              | ESLint in every workspace                          |
| `pnpm typecheck`         | `tsc --noEmit` in every workspace                  |
| `pnpm test`              | Vitest in every workspace                          |
| `pnpm format`            | Prettier write                                     |
| `pnpm db:generate`       | `prisma generate`                                  |
| `pnpm db:migrate`        | `prisma migrate dev` (local development)           |
| `pnpm db:migrate:deploy` | `prisma migrate deploy` (production)               |
| `pnpm db:studio`         | Prisma Studio                                      |

> Prisma 7 has no `postinstall` hook, so `prisma generate` runs as part of the
> API's `dev`, `build` and `typecheck` scripts. You rarely need to call it
> manually.

## API

Base path: `/api/v1`.

| Method   | Path                    | Description                                                      |
| -------- | ----------------------- | ---------------------------------------------------------------- |
| `GET`    | `/health`               | Liveness + database check (used by the Railway healthcheck)      |
| `GET`    | `/dashboard/stats`      | Totals, files uploaded today, five most recent uploads           |
| `GET`    | `/files`                | Paginated list: `page`, `limit`, `search`, `sortBy`, `sortOrder` |
| `POST`   | `/files/presign-upload` | Body `{ originalName, mimeType, size }` → presigned PUT URL      |
| `POST`   | `/files/:id/confirm`    | Verifies the object in S3 and marks the row `UPLOADED`           |
| `GET`    | `/files/:id/download`   | Presigned GET URL, valid up to 5 minutes                         |
| `DELETE` | `/files/:id`            | Deletes the S3 object, then the row                              |

`sortBy` accepts `createdAt`, `uploadedAt`, `originalName` or `size`;
`sortOrder` accepts `asc` or `desc`.

### Response envelopes

Success:

```json
{ "success": true, "data": {} }
```

Paginated:

```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {}
  }
}
```

Error codes: `VALIDATION_ERROR`, `FORBIDDEN`, `NOT_FOUND`, `PAYLOAD_TOO_LARGE`,
`UNSUPPORTED_MEDIA_TYPE`, `UPLOAD_NOT_COMPLETED`, `STORAGE_ERROR`,
`RATE_LIMITED`, `INTERNAL_ERROR`.

### Example: full upload flow with curl

```bash
API=http://localhost:4000/api/v1

# 1. Ask for a presigned URL
RESP=$(curl -s -X POST "$API/files/presign-upload" \
  -H 'content-type: application/json' \
  -d '{"originalName":"report.txt","mimeType":"text/plain","size":11}')

FILE_ID=$(echo "$RESP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["fileId"])')
UPLOAD_URL=$(echo "$RESP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["uploadUrl"])')

# 2. Upload straight to S3 (Content-Type must match the signed one)
echo 'hello world' | curl -s -X PUT --upload-file - -H 'content-type: text/plain' "$UPLOAD_URL"

# 3. Confirm
curl -s -X POST "$API/files/$FILE_ID/confirm"

# 4. Download
curl -s "$API/files/$FILE_ID/download"
```

## File restrictions

Allowed MIME types: JPEG, PNG, GIF, WebP images, PDF, TXT, CSV, Word (`.doc`,
`.docx`), Excel (`.xls`, `.xlsx`) and ZIP.

Maximum size is 25 MB by default (`MAX_FILE_SIZE_MB`). Validation happens in
three places, and the extension alone is never trusted:

1. In the browser, before the upload starts (immediate feedback).
2. On the API, on the presign request (MIME allow-list + size).
3. On the API, on confirm, using the real object metadata from `HeadObject` —
   an oversized or wrong-typed object is deleted from S3 and the row is marked
   `FAILED`.

## AWS S3 setup

### 1. Create a private bucket

1. S3 → **Create bucket**, pick a name and the region you will put in
   `AWS_REGION`.
2. Keep **Block all public access** enabled.
3. Leave ACLs disabled (bucket owner enforced) and default encryption on.

Nothing else is needed: the app never makes objects public, it only issues
presigned URLs.

### 2. Bucket CORS

The browser uploads directly to S3, so the bucket must allow the frontend
origins. Bucket → **Permissions** → **Cross-origin resource sharing (CORS)**:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-app.vercel.app"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Do not use `"*"` in production. Add Vercel preview domains explicitly if you
need to upload from previews.

### 3. IAM user and minimal policy

IAM → **Users** → create a user for programmatic access only (no console
access), then attach an inline policy scoped to this one bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ObjectAccess",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::your-private-bucket/uploads/*"
    }
  ]
}
```

`s3:HeadObject` is not a separate IAM action — the `HeadObject` call used by the
confirm step is authorized by `s3:GetObject`. Never use `s3:*`.

Create an access key for that user and put it in `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY`.

### 4. Credentials on Railway

In the Railway service → **Variables**, add `AWS_REGION`,
`AWS_S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. They stay
server-side; the frontend never receives them.

### 5. Testing upload and download

Open `/files`, drop a file, watch the progress bar, then check that the object
appears under `uploads/<year>/<month>/` in the bucket. Click **Download** — the
browser opens a presigned URL that expires in 5 minutes. Copy that URL and try
it again after it expires, or open the object's plain S3 URL: both must fail,
which proves the bucket is private.

## Railway deployment (API + PostgreSQL)

1. **Database**: New → **Database** → **Add PostgreSQL**.
2. **API service**: New → **GitHub Repo** → pick this repository.
3. Service **Settings**:
   - Root Directory: `/` (the repository root — the Docker build needs the
     workspace files)
   - Builder: **Dockerfile**
   - Dockerfile Path: `apps/api/Dockerfile`
   - Healthcheck Path: `/api/v1/health`

   `apps/api/railway.json` already contains the builder, Dockerfile path,
   healthcheck and restart policy; keep the service root at `/` and Railway
   picks the rest up.

4. **Variables** on the API service:

   ```env
   DATABASE_URL=${{ Postgres.DATABASE_URL }}
   NODE_ENV=production
   FRONTEND_URL=https://your-app.vercel.app
   AWS_REGION=eu-central-1
   AWS_S3_BUCKET_NAME=your-private-bucket
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   PRESIGNED_UPLOAD_EXPIRES_IN=300
   PRESIGNED_DOWNLOAD_EXPIRES_IN=300
   MAX_FILE_SIZE_MB=25
   ```

   Do not set `PORT` — Railway injects it, the server binds to
   `0.0.0.0:$PORT`.

5. **Migrations** run automatically: `docker-entrypoint.sh` executes
   `prisma migrate deploy` before starting the server, so every deploy applies
   pending migrations exactly once and never uses `prisma db push`. Set
   `RUN_MIGRATIONS_ON_START=false` if you prefer to run migrations from a
   separate job.
6. Generate a public domain for the service and use
   `https://<domain>/api/v1` as `NEXT_PUBLIC_API_URL` on Vercel.

The Dockerfile is multi-stage: the build stage installs the whole workspace and
runs `prisma generate` + `tsc`, the runtime stage installs production
dependencies only and copies the compiled `dist` folders.

## Vercel deployment (frontend)

1. Import the repository, then in project settings:
   - Root Directory: `apps/web`
   - Include files outside the root directory: **enabled** (needed for
     `packages/shared`)
   - Framework Preset: **Next.js**
   - Install Command: `pnpm install --frozen-lockfile` (run at the repo root)
   - Build Command: `cd ../.. && pnpm --filter @rental-admin/shared build && pnpm --filter @rental-admin/web build`
   - Output Directory: leave empty (Next.js default `.next`)
2. Environment variables:

   ```env
   NEXT_PUBLIC_API_URL=https://your-api.up.railway.app/api/v1
   NEXT_PUBLIC_APP_ENV=production
   NEXT_PUBLIC_APP_VERSION=0.1.0
   ```

3. After the first deploy, add the Vercel domain to the API's `FRONTEND_URL`
   and to the S3 bucket CORS configuration.

No `next/image` remote patterns are configured because the app never renders
remote images — files are downloaded, not embedded.

## Security

- The bucket is private; the app only ever hands out presigned URLs that expire
  after at most 5 minutes.
- AWS credentials exist only on the server. The frontend receives a URL, never a
  key.
- Size and MIME type are validated on the client, on presign, and again against
  the real object on confirm.
- File names are sanitized (transliterated, lowercased, stripped of path
  separators) and the storage key always contains a fresh UUID, so a crafted
  name cannot overwrite another object or escape the `uploads/` prefix.
- `storageKey` is stripped from every API response.
- Helmet security headers, an explicit CORS allow-list (wildcards rejected at
  startup), and rate limiting (stricter on presign/confirm/delete).
- Unexpected 5xx errors return a generic message; the full error, stack and
  request context are logged server-side only.
- `.env` files are gitignored; only `.env.example` files are committed.

### Adding authentication later

Ownership hooks are deliberately shallow: add an `auth` middleware in
`apps/api/src/middleware`, mount it on `fileRouter` and `dashboardRouter` in
`apps/api/src/routes`, add a `userId` column to `FileObject`, and add the filter
in `file.service.ts`. No controller or component needs to change.

## Testing

```bash
pnpm test
```

Backend (`apps/api`, Vitest, node environment):

- presign request validation (missing fields, bad types)
- rejecting a file above `MAX_FILE_SIZE_MB`
- rejecting a disallowed MIME type
- list query parsing (pagination bounds, sort fields)
- API error formatting, including production message hiding
- file name sanitization and storage key generation
- Express integration tests via supertest

Frontend (`apps/web`, Vitest, jsdom):

- file size / date / MIME formatting
- client-side file validation (size and type)
- empty state rendering

Prisma and S3 are not touched by unit tests; the storage layer is exercised
through the API integration tests and by the manual flow described above.

## Known limitations

- No authentication, users, roles or file ownership yet.
- Single-file uploads only — no multi-select and no multipart upload, so the
  25 MB limit is a hard ceiling.
- No thumbnails or in-app previews; files are only downloaded.
- No virus scanning and no content sniffing beyond the MIME type reported by the
  browser and by S3.
- Rows left in `PENDING` (the browser closed mid-upload) are hidden from the
  list but not garbage-collected; a scheduled cleanup job is the obvious next
  step.
- Search is a case-insensitive substring match on the original name and the
  sanitized key, not full-text search.
- Dashboard "uploaded today" is calculated in UTC.
