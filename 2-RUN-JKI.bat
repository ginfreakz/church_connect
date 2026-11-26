@echo off
setlocal
cd /d "%~dp0"
title JKI Obed Edom Ministry

echo ========================================
echo JKI Obed Edom Ministry - Start App
echo ========================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  pause
  exit /b 1
)

echo Closing old app process on port 3000 (if any)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue ^| Select-Object -ExpandProperty OwningProcess -Unique ^| ForEach-Object { Stop-Process -Id $_ -Force }" >nul 2>nul

if "%~1"=="--updated" goto prepare

rem git pull may replace this very file while it runs. cmd reads a ( ) block completely
rem before executing it, so the update and the restart of the (new) file stay in one block.
(
  node scripts\prepare-app.mjs update
  "%~f0" --updated
)

:prepare
node scripts\prepare-app.mjs prepare
if errorlevel 1 (
  echo.
  echo [ERROR] Aplikasi gagal disiapkan. Foto layar ini dan kirim ke admin.
  pause
  exit /b 1
)

echo Opening app in browser...
start "" "http://localhost:3000"

echo Starting app server...
start "JKI Obed Edom Ministry Server" cmd /k "cd /d %~dp0 && npm run dev"

echo App launch triggered. You may close this window.
pause
