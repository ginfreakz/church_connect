<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Church Connect Local Setup

This project uses SQLite + Prisma for data in:

- `/api/stats`
- `/api/jemaat`
- `/api/transactions`

## Prerequisites

- Node.js LTS

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Create `.env` from `.env.example` if needed, then ensure this exists:

```env
DATABASE_URL="file:./church-connect.db"
```

If you still use Gemini features, also set `GEMINI_API_KEY` in `.env.local`.

## 3. Run migrations + seed

```bash
npm run db:setup
```

## 4. Start app

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

## Database Backup

This project uses SQLite. The database is a single file at:

- `church-connect.db`

To backup, simply copy this file. To regenerate SQL backup:

```bash
npm run db:backup
```

## One-Click Run For Non-Technical Users (Windows)

This repo includes ready-to-use batch launchers:

- `1-SETUP-FIRST-TIME.bat`: Run once after cloning/downloading project.
- `2-RUN-JKI.bat`: Daily launcher (double-click to run app).
- `3-STOP-JKI.bat`: Stop app.

Recommended flow on user laptop:

1. Install Node.js LTS.
2. Double-click `1-SETUP-FIRST-TIME.bat` (first time only).
3. For daily use, double-click `2-RUN-JKI.bat`.

The launcher will:

- apply migrations,
- start app server,
- open browser automatically to `http://localhost:3000`.

## Advantages Over PostgreSQL

- **No Docker required** - database is just a file
- **Lightweight** - no separate database service
- **Easy backup** - copy the `.db` file
- **Portable** - runs anywhere with Node.js
