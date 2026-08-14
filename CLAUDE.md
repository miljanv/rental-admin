# Rental Admin — engineering handbook

This file is the source of truth for architecture, module layout, naming, and
style. Follow it in every session. Prefer existing patterns over new ones.
Do not invent a parallel stack.

If a request conflicts with this document, follow this document and say so.

---

## What this is

A pnpm monorepo: a Next.js admin UI and an Express API that store **metadata in
PostgreSQL** and **file bytes in a private S3 bucket**. The browser uploads
directly to S3 with a short-lived presigned URL. The API never sees file bytes.

| App | Package | Runtime | Host |
| --- | --- | --- | --- |
| Frontend | `@rental-admin/web` | Next.js 16 App Router, React 19 | Vercel |
| Backend | `@rental-admin/api` | Express 5, Prisma 7, Node 22 | Railway (Docker) |
| Shared | `@rental-admin/shared` | Zod schemas, types, constants | built first |

There is **session auth**. `POST /api/v1/auth/login` checks a bcrypt hash in
PostgreSQL and returns a JWT. `requireAuth` protects `/files` and `/dashboard`.
Health and login stay public. The web app hides `AppShell` until `/auth/me`
succeeds.

There is **no React Router**. Routing is Next.js App Router only
(`apps/web/src/app`).

---

## Non-negotiables

1. TypeScript **strict**. No `any` unless a typed boundary is impossible, and
   then isolate it in one helper with a comment.
2. Shared contracts live in `@rental-admin/shared`. Do not duplicate Zod
   schemas, DTO types, MIME allow-lists, or error codes in web or api.
3. **Direct-to-S3 uploads.** Do not proxy file bytes through Express. The API
   signs URLs, stores metadata, and confirms with `HeadObject`.
4. AWS credentials, `DATABASE_URL`, and secrets stay on the API. The web app
   may only read `NEXT_PUBLIC_*`.
5. `storageKey` is never sent to the client. Map through `toFileObjectDto`.
6. Controllers are thin. Business logic lives in services. UI components do
   not call Axios; they call feature hooks.
7. Reuse shadcn/ui, existing layout, query keys, error envelope, and mappers.
   Do not add a new UI kit, state library, or HTTP client.
8. Every user-facing list/detail has loading, empty, and error states.
9. Minimize diffs. No drive-by refactors, no new markdown unless asked.

---

## Repository layout

```text
rental-admin/
├── apps/api/src/
│   ├── config/          # env (Zod), prisma, s3, app-info
│   ├── controllers/     # read validated input, send envelope, nothing else
│   ├── middleware/      # validate-request, error-handler, not-found, rate-limit
│   ├── routes/          # wire middleware + controllers; mounted at /api/v1
│   ├── schemas/         # API-only Zod (env-dependent limits)
│   ├── services/        # business logic, Prisma, S3
│   ├── utils/           # AppError, envelopes, mappers, logger, storage-key
│   ├── app.ts           # Express assembly
│   └── server.ts        # listen + graceful shutdown
├── apps/web/src/
│   ├── app/             # routes only: page.tsx + metadata
│   ├── components/
│   │   ├── ui/          # shadcn primitives — do not edit unless necessary
│   │   ├── layout/      # AppShell, sidebar, header, breadcrumbs
│   │   └── common/      # page-header, empty-state, error-state, table-skeleton
│   ├── features/<name>/
│   │   ├── api/         # Axios calls, unwrap envelopes
│   │   ├── hooks/       # TanStack Query / mutations
│   │   ├── schemas/     # client Zod (forms)
│   │   └── components/  # feature UI
│   ├── lib/             # api-client, api-error, env, query-keys, format
│   ├── providers/       # QueryProvider, ThemeProvider
│   └── types/
├── packages/shared/src/ # constants, schemas, types — used by both apps
└── packages/typescript-config/
```

New domain = new `features/<name>/` folder with the same four slots, plus API
`routes` / `controllers` / `services` / `schemas`. Do not dump feature code
into `components/` or `lib/`.

---

## Naming

| Thing | Convention | Examples |
| --- | --- | --- |
| Files and folders | `kebab-case` | `file.service.ts`, `use-upload-file.ts`, `files-manager.tsx` |
| React components | `PascalCase`, named export | `export function FilesTable` |
| Next.js pages / layouts | `default` export | `export default function FilesPage` |
| Hooks | `use` + `PascalCase` | `useFiles`, `useUploadFile` |
| API functions | verb + noun | `fetchFiles`, `requestUploadUrl`, `confirmUpload` |
| Query keys | factory in `lib/query-keys.ts` | `queryKeys.files.list(params)` |
| Prisma models | `PascalCase` | `FileObject` |
| DB enums | `SCREAMING_SNAKE` | `PENDING`, `UPLOADED`, `FAILED` |
| Env vars | `SCREAMING_SNAKE` | `AWS_S3_BUCKET_NAME`, `NEXT_PUBLIC_API_URL` |
| Error codes | `SCREAMING_SNAKE` in `API_ERROR_CODES` | `UPLOAD_NOT_COMPLETED` |
| CSS | Tailwind utilities + `cn()` | no CSS modules, no styled-components |

Path aliases:

- Web: `@/` → `apps/web/src/`
- Shared package: `@rental-admin/shared`

---

## TypeScript

- Strict tsconfig from `packages/typescript-config` (`noUncheckedIndexedAccess`,
  `noUnusedLocals`, `noImplicitReturns`).
- Prefer `unknown` + narrowing over `any`.
- Explicit return types on exported functions.
- Shared types come from `@rental-admin/shared`. Web-only view types may live
  next to the feature.
- Do not disable `typescript.ignoreBuildErrors`.
- Validate env with Zod at startup (`apps/api/src/config/env.ts`,
  `apps/web/src/lib/env.ts`). Fail fast with a readable message.

Prettier (do not reformat to another style):

- semicolons, single quotes, trailing commas, `printWidth` 100, 2-space indent

---

## Backend

### Request pipeline

```text
route → validateRequest(Zod) → controller → service → (Prisma | S3)
                                              ↓
                                    sendSuccess / sendPaginated / throw AppError
                                              ↓
                                         errorHandler
```

- Routes declare schemas and rate limiters. They do not contain logic.
- Controllers call `validated<T>(req, 'body' | 'query' | 'params')` and
  `sendSuccess` / `sendPaginated`. No Prisma in controllers.
- Services throw `AppError` helpers (`notFound`, `payloadTooLarge`, …).
  Never `res.status()` from a service.
- `validateRequest` stores parsed data on `req.validated`. Do not write to
  `req.query` (read-only in Express 5).

### HTTP

- Base path: `/api/v1`.
- Success: `{ success: true, data }`
- Paginated: `{ success: true, data: [], pagination: { page, limit, total, totalPages } }`
- Error: `{ success: false, error: { code, message, details? } }`
- Unexpected 5xx: generic client message; log the real error server-side.

### Files / S3

Upload flow is fixed:

1. `POST /files/presign-upload` → validate MIME + size → `PENDING` row → presigned PUT
2. Browser `PUT` to S3 (`storageClient`, only `Content-Type`)
3. `POST /files/:id/confirm` → `HeadObject` → `UPLOADED` or `FAILED`
4. List returns **`UPLOADED` only** unless `status` is queried
5. Download: presigned GET, max 5 minutes, `Content-Disposition: attachment`
6. Delete: S3 object first, then the row

`createUploadUrl` signs `ContentType`. The client `Content-Type` must match.
Do not add extra headers on `storageClient` (CORS / signature).

### Database

- Prisma 7. Schema in `apps/api/prisma/schema.prisma`.
- Local: `pnpm db:migrate`. Production: `prisma migrate deploy` (entrypoint).
- Never `db push` in production. Never destructive migrations without a warning.
- Avoid N+1. Index filters you actually query (`status`, `createdAt`).

### Auth

- `POST /api/v1/auth/login` → `{ token, user }`. Password compared with bcrypt.
- `GET /api/v1/auth/me` and every file/dashboard route require
  `Authorization: Bearer`.
- Do not add Clerk or NextAuth. Keep JWT + `requireAuth` on the routers.
- Seeded bootstrap user is `admin` / `admin123` (change in production).

---

## Frontend

### Routing and layout

- Next.js App Router. Pages live in `src/app`. No `react-router`.
- `src/app/layout.tsx` wraps:

  `ThemeProvider` → `QueryProvider` → `AppShell` → `Toaster`

- `AppShell`: fixed sidebar (`lg:w-64`) + `AppHeader` (mobile drawer) +
  `<main>` with `max-w-7xl`.
- Nav items: single list in `components/layout/nav-items.ts`. Sidebar and
  breadcrumbs both read it. Add a route there when you add a page.
- Pages are thin: metadata + one feature component.

```tsx
// ✅ page
export default function FilesPage() {
  return <FilesManager />;
}

// ❌ page that fetches, owns table state, and calls Axios
```

### `'use client'`

- Default to Server Components.
- Client only when you need state, effects, TanStack Query, or browser APIs.
- Keep `'use client'` at feature components / providers, not at `layout.tsx`
  unless required.

### TanStack Query

- One `QueryClient` from `providers/query-provider.tsx`. Do not create another.
- Defaults: `staleTime: 30s`, `refetchOnWindowFocus: false`, retry only
  network / 408 / 429 / 5xx (max 2). Mutations do not retry.
- Keys: **only** via `queryKeys` in `lib/query-keys.ts`.
- List hooks use `placeholderData: (previous) => previous` for pagination.
- After mutations, invalidate `queryKeys.files.all` and
  `queryKeys.dashboard.all` — not individual pages.
- Pass `signal` into Axios so unmount cancels in-flight requests.

```ts
// ✅
useQuery({
  queryKey: queryKeys.files.list(params),
  queryFn: ({ signal }) => fetchFiles(params, signal),
  placeholderData: (previous) => previous,
});

// ❌
useQuery({ queryKey: ['files', page], queryFn: () => axios.get('/files') });
```

### Data access layers

```text
component → hooks/use-*.ts → api/*-api.ts → apiClient / storageClient
```

- `apiClient`: JSON, `baseURL` from `NEXT_PUBLIC_API_URL` (includes `/api/v1`).
- `storageClient`: S3 PUT only. No API headers, no `Accept` default.
- Unwrap `{ success, data }` with `unwrap()`. Map failures with `parseApiError`
  / `getApiErrorMessage`. Toasts via Sonner.

### Forms

- `react-hook-form` + `@hookform/resolvers/zod`.
- Client schema in `features/<name>/schemas`. Reuse shared MIME / size helpers.
- The API enforces limits again. Client validation is UX, not security.

### UI

- shadcn/ui in `components/ui`. Add primitives with the existing stack
  (Radix, CVA, Tailwind 4). Do not introduce MUI / Chakra / another table lib.
- Feature screens: `Card`, `PageHeader`, `EmptyState`, `ErrorState`,
  `TableSkeleton`.
- Icons: Lucide. Toasts: Sonner. Theme: `next-themes`.
- Tailwind only. Use `cn()` from `lib/utils`. Mobile-first. Dark mode via
  CSS variables already on `AppShell` (`bg-sidebar`, `bg-background`).
- Copy is English, sentence case.

---

## Shared package

`@rental-admin/shared` builds to `dist/` (`main` / `exports` point at
`dist/index.js`). **Build it before web or api.**

```bash
pnpm --filter @rental-admin/shared build
```

Local `pnpm dev` and Vercel `apps/web/vercel.json` already do this. If you add
a consumer, keep that order.

Put here: MIME allow-list, pagination defaults, Zod for presign/list, DTO
types, API error codes, envelopes. Put env-specific limits (max MB from
`MAX_FILE_SIZE_MB`) in the API schema factory, not hardcoded in shared.

---

## Testing

- Vitest. Colocate `*.test.ts` next to the unit.
- API: Zod cases, mappers, sanitization, Express via supertest. Do not hit
  real S3 or Postgres in unit tests (`vitest.setup.ts` stubs env).
- Web: formatters, client validation, empty states. Query/network stays mocked.
- Run `pnpm test`, `pnpm typecheck`, `pnpm lint` after behavior changes.

---

## Git

- Default branch: `main`.
- Conventional Commits, imperative, English:

  ```text
  feat(files): add inline image preview dialog
  fix(api): reject oversized confirm with FAILED status
  refactor(web): colocate upload progress in use-upload-file
  chore: add Vercel build command for shared package
  docs: document S3 CORS for localhost
  test(api): cover storage key sanitization
  ```

- Scope is the area: `api`, `web`, `shared`, `files`, `dashboard`.
- Subject: what changed and why it exists, not “fix comments” / “WIP”.
- Do not commit `.env`, `.env.local`, credentials, or `dist/`.
- Do not push, force-push, or amend unless asked.
- Do not update git config.

---

## Deploy

| Piece | Where | Notes |
| --- | --- | --- |
| Web | Vercel, root `apps/web` | Include files outside root. Build shared then web. Only `NEXT_PUBLIC_*`. |
| API | Railway, Dockerfile `apps/api/Dockerfile`, context `/` | Builder **Dockerfile**, not Railpack. Do not set `PORT`. |
| DB | Railway PostgreSQL | `DATABASE_URL=${{Postgres.DATABASE_URL}}` |
| Files | Private S3 | Bucket CORS must allow the Vercel origin and `http://localhost:3000`. |

`FRONTEND_URL` on the API is a comma-separated origin list, no trailing slash,
no `*`.

---

## Adding a feature (checklist)

1. Shared types / Zod if both sides need them.
2. Prisma model + migration if data changes.
3. API: schema → service → controller → route under `/api/v1`.
4. Web: `features/<name>/api` → `hooks` → `components`.
5. `queryKeys` entry; invalidate the `all` key from mutations.
6. Page in `src/app/.../page.tsx` + `NAV_ITEMS` if it is a primary screen.
7. Loading / empty / error + toasts on mutations.
8. Tests for the new validation or mapper.
9. Keep AWS keys and storage keys off the client.

---

## Do not

- Add React Router, Redux, Zustand, React Query v4, Axios instances besides
  `apiClient` / `storageClient`, or a second `QueryClient`.
- Fetch in Server Components from the Express API unless there is a clear
  reason; the panel is a client-side admin on TanStack Query.
- Use `next/image` remote patterns for S3 objects (private bucket; use
  download / preview via presigned GET).
- Use `prisma db push` on Railway, or change the Docker build context to
  `apps/api` (workspace packages would disappear).
- Expose `storageKey`, IAM keys, or `DATABASE_URL` to the browser.
- Introduce SVG upload (XSS on the S3 origin).
- Rewrite working code to match a personal preference.
