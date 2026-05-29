@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo JKI Taman Firdaus - First Time Setup
echo ========================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Please install Node.js LTS first, then run this file again.
  pause
  exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker Desktop is not installed.
  echo Please install Docker Desktop first, then run this file again.
  pause
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker Desktop is not running.
  echo Please open Docker Desktop and wait until it is fully started.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo Starting PostgreSQL container...
call docker compose up -d
if errorlevel 1 (
  echo [ERROR] Failed to start docker compose.
  pause
  exit /b 1
)

echo Applying database migrations...
call npm run prisma:deploy
if errorlevel 1 (
  echo [ERROR] Failed to apply database migrations.
  pause
  exit /b 1
)

if exist database-backup\church_connect_latest.sql (
  echo Restoring database backup snapshot...
  type database-backup\church_connect_latest.sql | docker exec -i church-connect-postgres psql -U postgres -d church_connect
  if errorlevel 1 (
    echo [WARNING] Backup restore failed. You can still run the app and seed manually.
  )
) else (
  echo [WARNING] Backup file not found: database-backup\church_connect_latest.sql
)

echo Setup completed.
echo Next time, run: 2-RUN-JKI.bat
pause
