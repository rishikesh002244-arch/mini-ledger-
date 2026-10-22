# MiniLedger

**A tiny ledger for the money you lend to friends.** Log a loan, attach the receipt, watch the due date, and know exactly how much is still outstanding.

Built for an internship assignment with a deliberately production-shaped backend and a polished Expo app.

<p align="center">
  <img src="screenshots/login.png" alt="MiniLedger login screen" width="260" />
  <img src="screenshots/dashboard.png" alt="MiniLedger dashboard" width="260" />
  <img src="screenshots/add-loan.png" alt="Add loan screen" width="260" />
</p>

---

## Table of contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Set up PostgreSQL](#1-set-up-postgresql)
  - [2. Run the backend](#2-run-the-backend)
  - [3. Run the Expo app](#3-run-the-expo-app)
- [Demo login](#demo-login)
- [API reference](#api-reference)
  - [Auth](#auth)
  - [Loans](#loans)
  - [Response shape and errors](#response-shape-and-errors)
- [Database model](#database-model)
- [Engineering decisions](#engineering-decisions)
- [Scripts](#scripts)
- [End-to-end smoke test](#end-to-end-smoke-test)
- [Design system](#design-system)
- [Troubleshooting](#troubleshooting)
- [Production hardening notes](#production-hardening-notes)
- [Assignment checklist](#assignment-checklist)

---

## What it does

- **Phone + mock OTP login.** A random 6-digit code is printed to the API console, stored only as an HMAC (with expiry, attempt limits, resend cooldown), and exchanged for a signed JWT.
- **A ledger per user.** Add money you lent, record who borrowed it, the amount, the due date, and an optional receipt photo.
- **Live summary.** Total lent, total repaid, overdue amount, outstanding balance, counts, and recovery progress — aggregated in PostgreSQL, not in the app.
- **Overdue awareness.** Entries past their due date get a red rail, tinted background, and a clear “Overdue by N days” label.
- **Receipt uploads.** Multipart upload through Multer to `backend/uploads/`, served back as static images; the app picks photos with `expo-image-picker`.
- **Filters and search.** The app filters by pending, overdue, or repaid; the API also supports friend-name search, pagination, and sorting.
- **Extra endpoints.** Get a single loan, delete an entry, and an idempotent repay endpoint.

---

## Tech stack

| Layer | Tools |
| --- | --- |
| Backend runtime | Node.js, Express 4, TypeScript (strict) |
| Database | PostgreSQL + Prisma ORM 6 |
| Validation | Zod (body, query, params, environment variables) |
| Auth | `jsonwebtoken` (HS256), mock OTP hashed with HMAC-SHA256 |
| Uploads | Multer (disk storage, MIME allow-list, 5 MB limit) |
| API hardening | Helmet, CORS, compression, `express-rate-limit`, request IDs |
| Mobile | React Native 0.88 via Expo SDK 58, TypeScript |
| Mobile state | TanStack Query (server state) + React Context (auth) |
| Mobile navigation | React Navigation native stack |
| Mobile UX | Expo Linear Gradient, Haptics, SecureStore, custom Google Fonts |
| Tooling | `tsx` (dev runner), Prisma Migrate, `npm run smoke` E2E script |

---

## Architecture

The backend is layered so `server.ts` only boots the process. Requests move through predictable tiers:

```
HTTP request
   │
   ├─ requestId → helmet → cors → body parsers → rate limit
   │
   ├─ routes        src/modules/*/ *.routes.ts     (URL + middleware wiring)
   │     └─ middleware: requireAuth, uploadReceipt, validate(Zod)
   │
   ├─ controllers   *.controller.ts                (HTTP in/out only)
   │
   ├─ services      *.service.ts                   (business rules + Prisma)
   │
   └─ Prisma        PostgreSQL
        │
        └─ global error handler → consistent JSON error envelope
```

Why it matters:

- **Controllers know HTTP, services know the domain.** Services never touch `req`/`res`; controllers never build Prisma queries.
- **Validation happens before business logic.** A Zod-parsed, transformed payload lands on `req.validated`; controllers read it through `getValidated<T>()`.
- **Errors are thrown, not returned ad hoc.** `ApiError` and Prisma/Zod/Multer errors are all normalized by one error middleware.
- **Ownership is enforced at the query level.** Every loan query includes `userId` from the verified JWT, so one account can never read or repay another account's entries.

### Request lifecycle example — `POST /api/loans`

1. `requireAuth` verifies the bearer token and attaches `{ id, phone }` to `req.user`.
2. `uploadReceipt` accepts an optional `receipt` image (type + size checked, safe random filename).
3. `validate(createLoanSchema)` parses `friend_name`, `amount`, `due_date`, and `receipt_image_url`; failures return `422` with field-level details.
4. `loanController.createLoan` resolves the receipt URL and delegates to `loanService.create`.
5. The service stores a `Decimal(12,2)` amount against the authenticated `userId` and returns a DTO with derived `status`, `isOverdue`, and `daysOverdue`.
6. The response is `201` with `{ success: true, data: loan }`.

---

## Project structure

```
internship/
├── README.md
├── .gitignore
├── screenshots/                     # Real captures from the running app
│   ├── login.png
│   ├── otp.png
│   ├── dashboard.png
│   ├── dashboard-overdue.png
│   ├── add-loan.png
│   ├── add-loan-filled.png
│   └── repay-confirm.png
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   │       ├── migration_lock.toml
│   │       └── 20261021120000_init/migration.sql
│   ├── scripts/
│   │   └── smoke-test.ts            # 17-check E2E test through the HTTP API
│   ├── uploads/                     # Receipt images (gitignored, .gitkeep kept)
│   └── src/
│       ├── server.ts                # HTTP server + graceful shutdown
│       ├── app.ts                   # Express assembly (security, static, routes)
│       ├── routes/index.ts          # /api router
│       ├── config/
│       │   ├── env.ts               # Zod-validated environment
│       │   └── prisma.ts            # singleton PrismaClient
│       ├── common/
│       │   ├── errors/ApiError.ts
│       │   ├── http/asyncHandler.ts
│       │   ├── http/response.ts
│       │   ├── http/validated.ts
│       │   └── utils/{format,jwt,otp,phone}.ts
│       ├── middlewares/
│       │   ├── auth.middleware.ts
│       │   ├── error.middleware.ts
│       │   ├── rateLimit.middleware.ts
│       │   ├── requestId.middleware.ts
│       │   ├── upload.middleware.ts
│       │   └── validate.middleware.ts
│       ├── modules/
│       │   ├── auth/
│       │   │   ├── auth.routes.ts
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── auth.schemas.ts
│       │   │   └── auth.types.ts
│       │   └── loans/
│       │       ├── loan.routes.ts
│       │       ├── loan.controller.ts
│       │       ├── loan.service.ts
│       │       └── loan.schemas.ts
│       └── types/express.d.ts
│
└── frontend/
    ├── App.tsx                      # fonts, providers, navigation
    ├── app.json
    ├── index.ts
    ├── .env.example
    └── src/
        ├── api/{auth,loans}.ts
        ├── components/
        │   ├── AppButton.tsx
        │   ├── Avatar.tsx
        │   ├── BrandMark.tsx
        │   ├── ConfirmDialog.tsx
        │   ├── EmptyState.tsx
        │   ├── Field.tsx
        │   ├── FilterChips.tsx
        │   ├── LoanCard.tsx
        │   ├── OtpField.tsx
        │   ├── ReceiptModal.tsx
        │   ├── StatusPill.tsx
        │   └── SummaryCard.tsx
        ├── context/AuthContext.tsx
        ├── lib/{api,config,format,queryClient,storage}.ts
        ├── navigation/{RootNavigator.tsx,types.ts}
        ├── screens/{LoginScreen,DashboardScreen,AddLoanScreen}.tsx
        ├── theme/index.ts
        └── types/index.ts
```

---

## Getting started

### Prerequisites

- **Node.js 20+** (tested on Node 24) and npm
- **PostgreSQL 14+** running locally (verified on PostgreSQL 17) and `psql` on your PATH
- **Expo Go** on a phone, or an Android/iOS emulator
- Git Bash/PowerShell/terminal of your choice

### 1. Set up PostgreSQL

Create the database (from a terminal):

```bash
# macOS/Linux
createdb miniledger

# or with psql, any OS
psql -U postgres -c "CREATE DATABASE miniledger;"
```

If your PostgreSQL user has a password, remember it for the connection string. A typical local connection string is:

```
postgresql://postgres:postgres@localhost:5432/miniledger?schema=public
```

> Using pgAdmin instead? Create a database named `miniledger`, then use the same connection string format with your own credentials.

### 2. Run the backend

```bash
cd backend

# 1. Install dependencies (also generates the Prisma client)
npm install

# 2. Create your environment file
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env

# 3. Open .env and set at minimum:
#    DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/miniledger?schema=public
#    JWT_SECRET=<a long random string>
#    Generate a secret with:
#    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Create the tables
npm run prisma:migrate       # runs `prisma migrate dev`

# 5. (Optional but recommended) seed the demo account and 5 entries
npm run db:seed

# 6. Start the API
npm run dev
```

You should see:

```
  MiniLedger API
  ├─ environment : development
  ├─ listening   : http://localhost:4000
  ├─ health      : http://localhost:4000/health
  ├─ api base    : http://localhost:4000/api
  └─ receipts    : .../backend/uploads
```

Verify it:

```bash
curl http://localhost:4000/health
```

### 3. Run the Expo app

In a second terminal:

```bash
cd frontend
npm install
npx expo start
```

Then press:

- **`a`** for Android emulator
- **`i`** for iOS simulator (macOS)
- **`w`** for the browser
- Or scan the QR code with **Expo Go** on your phone

**How the app finds the API:** in development it reuses the Metro host automatically, so a phone on the same Wi-Fi talks to your laptop without configuration. If that does not fit your network, create `frontend/.env`:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
```

Use your computer's LAN IP for a physical device, and make sure port `4000` is reachable (allow Node through the firewall on Windows/macOS).

> **Expo SDK 58** is used. If Expo Go reports a version mismatch, run `npx expo install --fix` in `frontend/`.

---

## Demo login

The seed script creates:

| Field | Value |
| --- | --- |
| Phone | `+91 98765 43210` (you can also type `9876543210`) |
| OTP | Generated at request time; printed in the backend terminal |
| Entries | 5 (2 overdue, 2 pending, 1 repaid) |

1. Enter the demo phone number and tap **Send OTP**.
2. Read the OTP from the backend terminal:
   ```
   ┌──────────────────────────────────────────────┐
   │  MiniLedger · mock OTP                        │
   │  phone   +919876543210                        │
   │  code    428913                               │
   └──────────────────────────────────────────────┘
   ```
   In non-production environments the API also returns `devOtp`, so the app shows a tappable **“Demo OTP: 428913 — FILL”** chip. Production responses never include it.
3. Verify to receive a JWT; the app stores the session securely (SecureStore on native, localStorage on web).

> OTP resend has a 30-second cooldown and a 5-minute expiry, with 5 verification attempts. Those values are configurable in `backend/.env`.

---

## API reference

Base URL: `http://localhost:4000/api`

Protected routes require:

```
Authorization: Bearer <JWT>
```

### Auth

#### `POST /auth/request-otp`

```json
{ "phone": "9876543210" }
```

Normalizes the number to E.164 (`+919876543210`), creates the user if needed, generates a 6-digit OTP, logs it to the server console, and returns:

```json
{
  "success": true,
  "data": {
    "phone": "+919876543210",
    "expiresInSeconds": 300,
    "resendAfterSeconds": 30,
    "message": "OTP generated. Check the backend console for the 6-digit code.",
    "devOtp": "428913"
  }
}
```

`devOtp` is present only outside production. Responses are rate limited to 8 requests per 10 minutes per IP, plus the per-account cooldown.

#### `POST /auth/verify-otp`

```json
{ "phone": "9876543210", "otp": "428913" }
```

Success (`200`):

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": "7d",
    "user": {
      "id": "6f51...",
      "phone": "+919876543210",
      "name": "Demo User",
      "createdAt": "2026-10-21T16:30:00.000Z"
    },
    "message": "Phone verified successfully."
  }
}
```

The OTP is single-use and cleared after success. Wrong codes return `401 INVALID_OTP` with `attemptsRemaining`; expired codes return `400 OTP_EXPIRED`.

#### `GET /auth/me`

Returns the authenticated profile. Useful for restoring a session, which the app does on launch.

### Loans

All loan routes require a bearer token and are scoped to the token's user.

#### `GET /loans/summary`

```json
{
  "success": true,
  "data": {
    "currency": "INR",
    "totalLent": 6450.5,
    "totalRepaid": 800,
    "totalOverdue": 4000,
    "outstanding": 5650.5,
    "totalLoans": 5,
    "repaidCount": 1,
    "pendingCount": 2,
    "overdueCount": 2,
    "asOf": "2026-10-21T17:05:00.000Z"
  }
}
```

`totalOverdue` counts **unrepaid loans whose due date has passed**. `outstanding = totalLent − totalRepaid`. All money math happens in PostgreSQL with `Decimal(12,2)` and is serialized to a number at the edge.

#### `GET /loans`

Query parameters (all optional, validated):

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `status` | `all \| pending \| overdue \| repaid` | `all` | `pending` excludes overdue |
| `search` | string (≤80) | — | Case-insensitive friend name search |
| `page` | integer ≥1 | `1` | |
| `limit` | integer 1–100 | `50` | |
| `sortBy` | `dueDate \| amount \| createdAt` | `dueDate` | |
| `order` | `asc \| desc` | `asc` | |

Example: `GET /api/loans?status=overdue&search=rahul&limit=20`

```json
{
  "success": true,
  "data": [
    {
      "id": "0b8f...",
      "friendName": "Rahul Sharma",
      "amount": 2500,
      "currency": "INR",
      "dueDate": "2026-10-16T23:59:59.999Z",
      "receiptImageUrl": null,
      "isRepaid": false,
      "repaidAt": null,
      "status": "overdue",
      "isOverdue": true,
      "daysOverdue": 5,
      "daysUntilDue": -5,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "status": "overdue",
    "sortBy": "dueDate",
    "order": "asc"
  }
}
```

`status` is derived server-side from `isRepaid` and `dueDate` at request time, so no cron job is needed to mark entries overdue.

#### `POST /loans`

Accepts **JSON** or **multipart/form-data**.

| Field | Required | Validation |
| --- | --- | --- |
| `friend_name` | yes | trimmed, 2–80 chars |
| `amount` | yes | > 0, ≤ 1,000,000,000, rounded to 2 decimals |
| `due_date` | yes | `YYYY-MM-DD` (treated as end of that day) or ISO timestamp |
| `receipt_image_url` | no | `http(s)` URL or an `/uploads/...` path |
| `receipt` | no | multipart image — JPEG, PNG, WEBP, HEIC, HEIF, ≤5 MB |

JSON example:

```bash
curl -X POST http://localhost:4000/api/loans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "friend_name": "Aisha Khan",
    "amount": 1200.50,
    "due_date": "2026-11-15"
  }'
```

Multipart example (uploads the receipt and derives `receipt_image_url`):

```bash
curl -X POST http://localhost:4000/api/loans \
  -H "Authorization: Bearer $TOKEN" \
  -F "friend_name=Aisha Khan" \
  -F "amount=1200.50" \
  -F "due_date=2026-11-15" \
  -F "receipt=@/path/to/receipt.jpg"
```

Returns `201` with the created loan. If a request fails after a file was written, the error handler deletes the orphaned upload.

#### `PUT /loans/:id/repay`

Marks an entry repaid and sets `repaidAt`. **Idempotent**: calling it again returns `alreadyRepaid: true` without changing the timestamp.

```json
{
  "success": true,
  "data": {
    "loan": { "...": "...", "isRepaid": true, "repaidAt": "2026-10-21T17:10:00.000Z" },
    "alreadyRepaid": false,
    "message": "Loan marked as repaid."
  }
}
```

#### `GET /loans/:id`

Returns one owned loan, or `404 LOAN_NOT_FOUND`.

#### `DELETE /loans/:id`

Deletes an owned loan, removes its receipt file, and returns the deleted id. Useful for fixing mistakes.

#### `GET /uploads/<filename>`

Serves uploaded receipts as static files. The API returns host-relative paths (`/uploads/...`); the app resolves them against the API origin.

### Response shape and errors

Every success:

```json
{ "success": true, "data": { }, "meta": { } }
```

Every error (plus a correlating `requestId` header/body):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the highlighted fields and try again.",
    "details": [
      { "field": "amount", "message": "Amount must be greater than 0" },
      { "field": "due_date", "message": "Due date must be a valid date" }
    ]
  },
  "requestId": "e5e0c2d1-..."
}
```

| Status | Code | When |
| --- | --- | --- |
| `400` | `INVALID_JSON`, `OTP_EXPIRED`, `INVALID_FILE_TYPE` | Malformed input or expired OTP |
| `401` | `MISSING_TOKEN`, `INVALID_TOKEN`, `INVALID_OTP` | Auth failure |
| `404` | `LOAN_NOT_FOUND`, `ROUTE_NOT_FOUND` | Missing resource |
| `409` | `CONFLICT` | Unique constraint |
| `413` | `FILE_TOO_LARGE` | Receipt over the limit |
| `422` | `VALIDATION_ERROR` | Zod validation failed |
| `429` | `OTP_COOLDOWN`, `RATE_LIMITED` | Abuse protection |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected failure (generic message, stack only in dev) |

---

## Database model

```
User 1 ──── * Loan
```

**`users`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID | PK, generated |
| `phone` | text | unique, normalized E.164 |
| `name` | text? | optional display name |
| `otp_hash` | text? | HMAC-SHA256 of `phone:otp` |
| `otp_expires_at` | timestamp? | OTP TTL |
| `otp_attempts` | int | verification attempt counter |
| `otp_last_sent_at` | timestamp? | resend cooldown |
| `created_at`, `updated_at` | timestamp | |

**`loans`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID | PK |
| `user_id` | UUID | FK → users, cascade delete |
| `friend_name` | text | |
| `amount` | `DECIMAL(12,2)` | exact money storage |
| `due_date` | timestamp | end-of-day for date-only input |
| `receipt_image_url` | text? | `/uploads/...` or absolute URL |
| `is_repaid` | boolean | |
| `repaid_at` | timestamp? | |
| `created_at`, `updated_at` | timestamp | |

Indexes: `(user_id, is_repaid)` and `(user_id, due_date)` support the two hottest queries — list filtering and overdue aggregation.

---

## Engineering decisions

**Mock OTP, treated like a real secret.** The code is never stored in plain text. It is hashed with HMAC-SHA256 using the server secret, bound to the phone number (so it cannot be replayed on another account), compared in constant time, expires after 5 minutes, is limited to 5 attempts, and is cleared on success. The console print is the only “delivery channel” because this is a mock.

**End-of-day due dates.** A due date of `2026-11-15` means the loan is due through 23:59 on that date, not at 00:00 — so entries do not look overdue on the morning they are due. Full ISO timestamps are preserved when provided.

**Exact money, clean JSON.** Amounts are `Decimal(12,2)` in PostgreSQL, converted to strings for Prisma writes (avoiding float drift), and serialized to numbers only at the API boundary.

**Derived status instead of a scheduled job.** An entry is overdue if it is unpaid and `due_date < now`. This keeps the database consistent without background workers, and the list response includes `daysOverdue`/`daysUntilDue` so the client does not re-implement the rule.

**Validation stored on the request, not inline.** The Zod middleware replaces ad-hoc parsing, transforms dates/phone numbers once, and yields a 422 with field-level errors the form can map directly to inputs.

**Uploads that fail safely.** Filenames are generated server-side (no path traversal), the MIME allow-list and 5 MB cap are enforced in Multer, and the central error handler removes the file if validation or the database write fails.

**Typed, refreshed mobile data.** TanStack Query owns fetching, caching, retries, and invalidation. Repaying a loan invalidates the `['loans']` prefix, refreshing both the list and the summary without manual plumbing. Optimistic UI was intentionally avoided so the summary always reflects the server.

**Session handling.** JWTs are stored in Expo SecureStore (native) or localStorage (web). A `401` from any protected endpoint triggers one centralized sign-out, and app launch restores the session and refreshes the profile.

---

## Scripts

### Backend (`cd backend`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start with `tsx watch` on port 4000 |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:generate` | Regenerate Prisma Client |
| `npm run prisma:migrate` | Create/apply development migrations |
| `npm run prisma:deploy` | Apply existing migrations (CI/production) |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed the demo account and loans |
| `npm run smoke` | Run the 17-check E2E HTTP test |

### Frontend (`cd frontend`)

| Command | Description |
| --- | --- |
| `npx expo start` | Start Metro / Expo Go |
| `npx expo start --web` | Run in the browser |
| `npm run android` | Start and open an Android emulator |
| `npm run ios` | Start and open the iOS simulator |
| `npm run typecheck` | `tsc --noEmit` |

---

## End-to-end smoke test

With the API running in a non-production environment:

```bash
cd backend
npm run smoke
```

The script (`backend/scripts/smoke-test.ts`) uses the real HTTP API and asserts:

1. `/health` is up
2. Mock OTP login issues a JWT
3. Unauthenticated loan requests return `401`
4. New accounts start with an empty summary
5. JSON loan creation derives `overdue` correctly
6. Multipart receipt upload stores a file
7. The receipt is served back as `image/png`
8. Listing works with pagination meta
9. `status=overdue` filters correctly
10. Summary totals are exact (`totalLent`, `totalRepaid`, `totalOverdue`, `outstanding`)
11. Zod rejects invalid payloads with field details
12. Repay marks a loan repaid
13. Repay is idempotent
14. Summary reflects the repayment
15. Unknown loans return `404`
16. A second account cannot see the first account’s loans
17. Deleting a loan removes it

Latest run: **17/17 checks passed** against PostgreSQL 17.

---

## Design system

The app uses a warm “paper + forest + lime” palette with a dark gradient summary card, rather than the default purple Expo template.

| Token | Value | Use |
| --- | --- | --- |
| `paper` | `#F4F2E9` | App background |
| `forest` | `#0B3B2C` | Primary actions, summary card |
| `accent` | `#D9F27C` | Highlights, FAB, progress |
| `coral` | `#D84C3B` | Overdue states |
| `ink` | `#12261E` | Primary text |
| `border` | `#E5E1D3` | Hairlines and card borders |

Typography pairs **Space Grotesk** (display, amounts) with **Manrope** (body, labels). Components use an 8-point spacing rhythm, 22–28 px radii, and restrained shadows. Overdue cards carry a coral rail, tinted background, coral border, and an “Overdue by N days” line; repaid cards mute the amount and show a settled chip. The summary card is pinned above the scrolling list so totals stay visible while browsing entries.

### Screens

| Login | OTP | Dashboard |
| --- | --- | --- |
| ![Login](screenshots/login.png) | ![OTP](screenshots/otp.png) | ![Dashboard](screenshots/dashboard.png) |

| Overdue filter | Add entry | Filled form |
| --- | --- | --- |
| ![Overdue](screenshots/dashboard-overdue.png) | ![Add loan](screenshots/add-loan.png) | ![Filled](screenshots/add-loan-filled.png) |

---

## Troubleshooting

**`Can't reach database server` / Prisma `P1001`**
Check PostgreSQL is running (`pg_isready`) and that `DATABASE_URL` matches your user, password, port, and database name. On Windows, the default service is often `postgresql-x64-17` in Services.

**`Port 4000 is already in use`**
Stop the other process, or change `PORT` in `backend/.env` and set `EXPO_PUBLIC_API_URL` in `frontend/.env` to the matching origin, e.g. `http://localhost:4001` (the app appends `/api` itself).

**App shows “Cannot reach the MiniLedger API”**
The backend must be running. On a physical phone, `localhost` points at the phone, not your laptop: use `EXPO_PUBLIC_API_URL=http://<laptop-LAN-IP>:4000`, keep both devices on the same Wi-Fi, and allow port 4000 through the firewall. In development the app auto-detects the Metro host, which usually avoids this.

**OTP email/console confusion**
There is no email or SMS. The only delivery is the API console. If you missed it, wait for the 30-second cooldown and request a new code, or tap the Demo OTP chip in dev.

**`Environment variable not found: DATABASE_URL`**
Run Prisma commands from `backend/` so `.env` is loaded, or export `DATABASE_URL` in the shell.

**Uploads return 404**
Receipts are stored in `backend/uploads/`. Run the API from `backend/` (the upload path is resolved from the process working directory) and confirm the folder exists. The server recreates it on boot.

**Expo Go version mismatch**
Use the SDK 58-compatible Expo Go, or run `npx expo install --fix`. For a fully native build, `npx expo run:android` / `npx expo run:ios` can be used, but Expo Go is enough for this assignment.

**Database schema drift**
For iterative work, `npm run prisma:migrate`. To reset a disposable dev database, `npx prisma migrate reset` (this deletes data).

---

## Production hardening notes

This project is intentionally demo-friendly (mock OTP, no SMS provider). Before shipping to real users:

- Replace the console OTP with an SMS provider (e.g. Twilio/MSG91), keep the HMAC + expiry + attempt logic, and consider passcodes plus device binding.
- Serve over HTTPS and set strict `CORS_ORIGIN` instead of `*`.
- Move rate limiting to a shared store (Redis) when running more than one instance.
- Store receipts in object storage (S3/R2) instead of local disk, and serve them through signed URLs.
- Use a managed PostgreSQL instance with backups; set `connection_limit` and pool appropriately.
- Add refresh tokens/rotation and a revocation list for logout-everywhere.
- Add structured logging (Pino) and error reporting while keeping `requestId` correlation.
- Add CI that runs `tsc --noEmit`, `prisma migrate deploy`, and `npm run smoke` against an ephemeral database.

---

## Assignment checklist

| Requirement | Where |
| --- | --- |
| Phone login with mock 6-digit OTP printed to console | `auth.service.ts`, `otp.ts` |
| JWT issued after verification | `jwt.ts`, `auth.service.ts` |
| `POST /loans` | `loan.routes.ts`, `loan.controller.ts`, `loan.service.ts` |
| `PUT /loans/:id/repay` | same module, idempotent |
| `GET /loans` | pagination, filters, search, sorting |
| `GET /loans/summary` (lent, repaid, overdue) | SQL aggregate via Prisma |
| Backend layering (routes/controllers/services) | `src/modules/**` |
| Zod validation with readable errors | `*.schemas.ts`, `validate.middleware.ts` |
| Multer receipt upload to local `/uploads` | `upload.middleware.ts` |
| Central error handling | `error.middleware.ts` |
| Expo login + OTP screen | `LoginScreen.tsx` |
| Pinned summary + list with overdue highlight | `DashboardScreen.tsx`, `SummaryCard.tsx`, `LoanCard.tsx` |
| Add-entry form with image picker | `AddLoanScreen.tsx`, `expo-image-picker` |
| Professional README | this file |
