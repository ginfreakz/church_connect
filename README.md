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

To back up, copy this file together with the `uploads/` folder (see "User Data" below). To regenerate the SQL backup:

```bash
npm run db:backup
```

## One-Click Run For Non-Technical Users (Windows)

This repo includes ready-to-use batch launchers:

- `1-SETUP-FIRST-TIME.bat`: Run once after cloning. Safe to run again: it never re-seeds an existing database.
- `2-RUN-JKI.bat`: Daily launcher (double-click to run app).
- `3-STOP-JKI.bat`: Stop app.

Recommended flow on user laptop:

1. Install Node.js LTS and Git for Windows.
2. `git clone` this repo (do not download a ZIP: auto-update needs git).
3. Run `git pull` once by hand so Git Credential Manager saves the GitHub login (only needed if the repo is private).
4. Double-click `1-SETUP-FIRST-TIME.bat` (first time only).
5. For daily use, double-click `2-RUN-JKI.bat`.

`2-RUN-JKI.bat` will:

- stop an old app process on port 3000,
- **auto-update**: `git pull --ff-only` the latest version. If there is no internet or the laptop has local
  code changes, it prints a warning and starts the current version,
- run `npm ci` only when `package-lock.json` changed, and `prisma generate` only when the schema changed,
- back up `church-connect.db` to `database-backup/auto/` (last 20 kept), then apply migrations,
- seed demo data only when no database exists yet,
- start the server and open `http://localhost:3000`.

The logic lives in `scripts/prepare-app.mjs` (Node built-ins only).

### Shipping an update to the user

Commit and push to `main`. The next time the user double-clicks `2-RUN-JKI.bat`, they get it.
Schema changes must come with a migration (`npm run prisma:migrate`) so `prisma migrate deploy` can apply them.

## Letter Generator (Korwil Jabar → 04 Surat Menyurat)

"Buat Surat" writes outgoing letters in the church's letter format. The letterhead, logos, signature and stamp are
set once in **Kop Surat** (stored in the `Setting` table).

- The server renders the letter as HTML (`server/letter.ts`); the in-app preview and the PDF use the same HTML.
- PDFs are printed by the Microsoft Edge that ships with Windows (or Google Chrome) through `puppeteer-core`, so no
  browser is downloaded. Set `PDF_BROWSER_PATH` in `.env` to use another Chromium-based browser.
- If no browser can be started, the app offers the **Cetak** page instead (print → "Save as PDF").

## User Data (never in git)

| Path | Contents |
| --- | --- |
| `church-connect.db` | All records |
| `uploads/` | Attachments (Arsip Korwil Jabar), grouped as `uploads/gereja-lokal/<ID>/`, `uploads/rohaniwan/<ID>/` or `uploads/surat/<ID>/` |
| `database-backup/auto/` | Automatic DB snapshots taken on each app start |

To back up the laptop, copy `church-connect.db` **and** the `uploads/` folder.

## Advantages Over PostgreSQL

- **No Docker required** - database is just a file
- **Lightweight** - no separate database service
- **Easy backup** - copy the `.db` file
- **Portable** - runs anywhere with Node.js
