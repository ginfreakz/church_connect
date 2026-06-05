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

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo Generating Prisma client...
call npm run prisma:generate
if errorlevel 1 (
  echo [ERROR] Failed to generate Prisma client.
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

echo Seeding database...
call npm run prisma:seed
if errorlevel 1 (
  echo [WARNING] Database seed failed. You can still run the app.
)

echo Setup completed.
echo Next time, run: 2-RUN-JKI.bat
pause
