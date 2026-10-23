# MiniLedger

A small app to track money you have lent to friends.

- **Backend:** Node.js, TypeScript, Fastify, Zod, Prisma, PostgreSQL, Vitest
- **App:** React Native (Expo), TypeScript
- **Login:** phone number + mock OTP (the OTP is printed in the server log)

```
miniledger/
├── backend/   REST API (Fastify + Prisma + PostgreSQL)
├── mobile/    React Native app (Expo)
├── docs/      Notes on how everything works
```

## Features

- Phone + OTP login (6-digit OTP, 5 min expiry, max 5 wrong attempts, 30 s resend gap, OTP stored hashed)
- Add a loan entry (friend name, amount, due date) and mark it as repaid
- Summary: total lent, total repaid, still owed, overdue amount
- List with overdue entries highlighted in red and shown first
- **Bonus:** receipt photo upload and viewing, input validation (Zod on the server, checks in the app), automated tests

## Prerequisites

- Node.js 20+ and npm
- A PostgreSQL database: a free one from [neon.tech](https://neon.tech), or a local PostgreSQL 14+
- Expo Go app on your phone, or an Android emulator

## 1. Run the backend

**Database:** create a free PostgreSQL database on [neon.tech](https://neon.tech), click *Connect*, turn *Connection pooling* **off**, and copy the connection string into `backend/.env` as `DATABASE_URL="..."` (use `?sslmode=require` at the end). A local PostgreSQL works too.

```bash
cd backend
cp .env.example .env                 # Windows: copy .env.example .env
# open .env and put your PostgreSQL connection string in DATABASE_URL
npm install                          # also runs "prisma generate"
npx prisma migrate dev --name init   # creates the tables
npm run dev                          # API on http://localhost:4000
```

**The OTP appears in this terminal**, for example:
`[MOCK OTP] +919876543210 -> 482913 (valid for 5 minutes)`

Run the tests:

```bash
npm test
```

## 2. Run the mobile app

```bash
cd mobile
npm install
```

Tell the app where the backend is, using one of these:

| Where you run the app | API URL |
|---|---|
| Android emulator | `http://10.0.2.2:4000` (default, nothing to change) |
| Real phone with Expo Go | `http://<your-computer-IP>:4000` (phone and computer on the same Wi-Fi) |

```bash
# real phone example (macOS/Linux)
EXPO_PUBLIC_API_URL=http://192.168.1.5:4000 npx expo start
# Windows PowerShell
$env:EXPO_PUBLIC_API_URL="http://192.168.1.5:4000"; npx expo start
```

Then scan the QR code with Expo Go (or press `a` for the Android emulator).

Find your computer IP with `ipconfig` (Windows) or `ifconfig` / `ip a` (macOS/Linux).

## API

All `/loans` routes need the header `Authorization: Bearer <token>`.

| Method | Path | Body / notes |
|---|---|---|
| POST | `/auth/request-otp` | `{ "phone": "9876543210" }` |
| POST | `/auth/verify-otp` | `{ "phone": "9876543210", "otp": "482913" }` returns `{ token, user }` |
| POST | `/loans` | `{ "friendName": "Riya", "amount": 500, "dueDate": "2026-11-30" }` |
| GET | `/loans` | optional `?status=all|pending|repaid` |
| PATCH | `/loans/:id/repay` | marks the loan as repaid |
| GET | `/loans/summary` | `{ totalLent, totalRepaid, totalPending, overdueAmount, overdueCount }` |
| POST | `/loans/:id/receipt` | multipart form, field `receipt` (JPG/PNG/WEBP, max 5 MB) |
| GET | `/loans/:id/receipt` | returns the image |

Quick test with curl:

```bash
curl -X POST localhost:4000/auth/request-otp -H "Content-Type: application/json" -d '{"phone":"9876543210"}'
# read the OTP in the server log, then:
curl -X POST localhost:4000/auth/verify-otp -H "Content-Type: application/json" -d '{"phone":"9876543210","otp":"<OTP>"}'
```

## Design decisions

- **Overdue** means: status is pending AND due date is before today (in `APP_TIMEZONE`, default `Asia/Kolkata`). A loan due today is not overdue yet.
- **Money** is stored as `DECIMAL(12,2)` in PostgreSQL, not floating point, to avoid rounding errors.
- **Summary** is calculated in the database with aggregate queries, not by loading every row.
- **Every loan query is filtered by the logged-in user id**, so users cannot see or change each other's data.
- **OTP** is hashed (HMAC-SHA256) before saving, compared in constant time, and expires after 5 minutes.
- **Receipts** are saved on local disk in `backend/uploads`. For production this would move to object storage such as S3.

## Limitations (what I would do next)

- OTP is mocked. A real SMS provider would replace the log line in `auth.service.ts`.
- Receipts are on local disk, not cloud storage.
- No edit/delete entry, no pagination.
- Backend tests cover validation, helpers and auth guards. Full database tests would need a test database in CI.
