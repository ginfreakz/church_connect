@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo JKI Taman Firdaus - Start App
echo ========================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  pause
  exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker Desktop is not installed.
  pause
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker Desktop is not running.
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

echo Ensuring database migration state...
call npm run prisma:deploy
if errorlevel 1 (
  echo [ERROR] Failed to apply database migrations.
  pause
  exit /b 1
)

echo Closing old app process on port 3000 (if any)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue ^| Select-Object -ExpandProperty OwningProcess -Unique ^| ForEach-Object { Stop-Process -Id $_ -Force }" >nul 2>nul

echo Opening app in browser...
start "" "http://localhost:3000"

echo Starting app server...
start "JKI Taman Firdaus Server" cmd /k "cd /d %~dp0 && npm run dev"

echo App launch triggered. You may close this window.
pause
