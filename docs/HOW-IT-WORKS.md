# How MiniLedger works (read this before the interview)

## The big picture

```
React Native app  --HTTP/JSON-->  Fastify API  --Prisma-->  PostgreSQL
 (mobile/)                         (backend/)
```

The app never talks to the database. It calls the API, the API checks who you are, then reads or writes the database.

## Login flow (OTP)

1. User enters the phone number, the app calls `POST /auth/request-otp`.
2. Server validates and normalises the number to `+91XXXXXXXXXX` (`utils/loan.ts` -> `normalizeIndianPhone`).
3. Server makes a random 6-digit OTP with `crypto.randomInt`, saves only a **hash** of it in the `OtpCode` table with an expiry, and prints the OTP in the log (this is the "mock SMS").
4. User types the OTP, the app calls `POST /auth/verify-otp`.
5. Server finds the latest unused, unexpired OTP for that phone, compares hashes, and counts wrong attempts (max 5).
6. If correct, the user is created (first time) or found, and the server returns a **JWT** token.
7. The app saves the token in AsyncStorage and sends it as `Authorization: Bearer <token>` on every request, so the user stays logged in after closing the app.

## Backend files

| File | What it does |
|---|---|
| `src/server.ts` | Starts the server on the port |
| `src/app.ts` | Builds the Fastify app: plugins, routes, one central error handler |
| `src/config.ts` | Settings in one place (port, timezone, OTP rules) |
| `src/db.ts` | The Prisma client (database connection) |
| `src/modules/auth/*` | OTP request and verify. `schemas` = Zod validation, `service` = logic, `routes` = URLs |
| `src/modules/loans/*` | Add, list, repay, summary, receipt upload. Same 3-file pattern |
| `src/plugins/auth.ts` | `requireAuth`: rejects requests with a missing or invalid token (401) |
| `src/utils/loan.ts` | Pure helper functions (overdue rule, phone normalisation, timezone date) |
| `prisma/schema.prisma` | The database tables: User, OtpCode, Loan |
| `tests/*` | Vitest tests |

The routes / service / schemas split is a common pattern: **routes** receive the request, **schemas** validate it, **service** holds the business logic and database calls.

## How "overdue" and the summary work

- A loan is overdue when `status = PENDING` and `dueDate < today`.
- The summary uses three `aggregate` queries (sum of all, sum of repaid, sum of pending-and-past-due). The database does the adding, which is faster than looping in JavaScript.

## Validation

- Server (Zod): name 1-80 chars, amount > 0 with max 2 decimals, real calendar date, 10-digit Indian phone, 6-digit OTP.
- Invalid input returns `400` with a readable message. The app shows that message under the form.

## Mobile files

| File | What it does |
|---|---|
| `App.tsx` | Chooses the screen: login, list, or add form |
| `src/context/AuthContext.tsx` | Holds the logged-in user, saves and restores the token |
| `src/api/client.ts` | All server calls in one place, adds the token, turns errors into messages |
| `src/screens/LoginScreen.tsx` | Phone then OTP, with a 30 s resend timer |
| `src/screens/LoansScreen.tsx` | Summary card + list, pull to refresh, "+ Add" button |
| `src/screens/AddLoanScreen.tsx` | Add form, due date shortcuts, optional receipt photo |
| `src/components/SummaryCard.tsx`, `LoanItem.tsx` | The card and the list row (red when overdue) |

## Questions you may be asked

- **Why Decimal and not float?** Floats cannot represent values like 0.1 exactly, so money sums drift.
- **Why hash the OTP?** If the database leaks, the OTPs cannot be read directly.
- **How do you stop one user seeing another's loans?** Every query includes `userId` from the verified token.
- **What is a JWT?** A signed token holding the user id. The server verifies the signature, so it needs no session storage.
- **Why is the error handler registered before the routes?** Fastify plugins copy the parent's error handler when they are created.
- **What would you change for production?** Real SMS provider, S3 for receipts, refresh tokens, rate limit per phone number, HTTPS, CI running lint, types and tests.
