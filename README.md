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
DATABASE_URL="postgresql://church_user:church_pass@localhost:5432/church_connect?schema=public"
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
```
