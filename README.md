<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Church Connect Local Setup

This project now uses local PostgreSQL + Prisma for data in:

- `/api/stats`
- `/api/jemaat`
- `/api/transactions`

## Prerequisites

- Node.js
- Docker Desktop (recommended for local PostgreSQL)

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Create `.env` from `.env.example` if needed, then ensure this exists:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/church_connect?schema=public"
```

If you still use Gemini features, also set `GEMINI_API_KEY` in `.env.local`.

## 3. Start local PostgreSQL

```bash
docker compose up -d
```

## 4. Run migrations + seed

```bash
npm run db:setup
```

## 5. Start app

```bash
npm run dev
```

The server runs at `http://localhost:3000`.

## Useful Commands

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run db:backup
```

## Database Backup For Deployment

This repository includes a SQL backup snapshot at:

- `database-backup/church_connect_latest.sql`

To regenerate backup from your current local database:

```bash
npm run db:backup
```

To restore backup on a new laptop (PostgreSQL installed):

```bash
psql -h localhost -p 5432 -U postgres -d church_connect -f database-backup/church_connect_latest.sql
```

Then run app normally:

```bash
npm install
npm run dev
```

## One-Click Run For Non-Technical Users (Windows)

This repo includes ready-to-use batch launchers:

- `1-SETUP-FIRST-TIME.bat`: Run once after cloning/downloading project.
- `2-RUN-JKI.bat`: Daily launcher (double-click to run app).
- `3-STOP-JKI.bat`: Stop app and database container.

Recommended flow on user laptop:

1. Install Node.js LTS.
2. Install Docker Desktop and open it.
3. Double-click `1-SETUP-FIRST-TIME.bat` (first time only).
4. For daily use, double-click `2-RUN-JKI.bat`.

The launcher will:

- start PostgreSQL container,
- apply migrations,
- start app server,
- open browser automatically to `http://localhost:3000`.
