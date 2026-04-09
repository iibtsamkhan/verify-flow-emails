# VerifyFlow

Private email verification SaaS with Clerk-authenticated user workspace, secure admin control plane, and credit-based bulk verification.

## Database Choice

Use **PostgreSQL** (recommended: **Neon Postgres**). It fits this project best because it supports secure relational auth/account data, transactional credit deductions, job/result history, and admin audit workflows.

## Core Capabilities

- VoltAgent-inspired landing UI
- User auth with Clerk (`/sign-in`, `/sign-up`)
- User dashboard (`/dashboard`) with:
  - XLS / XLSX / CSV upload
  - Auto-detection of email columns
  - Bulk verification jobs with persisted results
  - Credit + subscription snapshot
- Admin auth isolated from Clerk (`/admin/login`)
  - Login only (no admin signup)
  - Default super-admin bootstrap from env
  - Password change
  - Super-admin can create additional admins
- Security separation:
  - User session and admin session are isolated
  - Admin routes require secure server-side cookie session

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma + PostgreSQL
- Clerk
- bcryptjs
- xlsx

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

3. Fill required values in `.env.local`:

- `DATABASE_URL`
- `VERIFYFLOW_ENGINE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ADMIN_DEFAULT_EMAIL`
- `ADMIN_DEFAULT_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_PADDLE_CHECKOUT_STARTER_URL`
- `NEXT_PUBLIC_PADDLE_CHECKOUT_GROWTH_URL`
- `NEXT_PUBLIC_PADDLE_CHECKOUT_SCALE_URL`
- `NEXT_PUBLIC_PADDLE_CUSTOMER_PORTAL_URL`

4. Generate Prisma client:

```bash
npx prisma generate
```

5. Push schema to database (dev):

```bash
npx prisma db push
```

6. Run dev server:

```bash
npm run dev
```

## Routes

- `/` landing page
- `/dashboard` user dashboard (Clerk required)
- `/admin/login` admin login
- `/admin` admin dashboard (admin session required)

## API Routes

- `POST /api/verify` single email verify
- `POST /api/bulk` disabled for public use (returns 403; dashboard flow only)
- `GET /api/user/me` user account + credits + jobs
- `POST /api/user/bulk-verify` authenticated bulk job verification
- `POST /api/admin/login` admin sign-in
- `POST /api/admin/logout` admin logout
- `GET /api/admin/me` admin profile + platform stats
- `POST /api/admin/change-password` admin password update
- `POST /api/admin/create-admin` super-admin only admin creation

## Notes

- Keep all admin credentials and secrets server-side only.
- Rotate `ADMIN_DEFAULT_PASSWORD` immediately in production.
- Rotate `ADMIN_SESSION_SECRET` periodically.
- Do not expose internal verification engine details in UI or marketing copy.
- Bulk verification credits are reserved at job start and automatically refunded if a job fails before completion.
- A hard paywall is enforced when credits reach `0`: verifier actions are disabled in UI and backend still blocks with HTTP `402`.
