@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo JKI Obed Edom Ministry - First Time Setup
echo ========================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Please install Node.js LTS first, then run this file again.
  pause
  exit /b 1
)

rem Safe to run again: existing data is backed up and never re-seeded.
node scripts\prepare-app.mjs prepare
if errorlevel 1 (
  echo [ERROR] Setup failed.
  pause
  exit /b 1
)

echo Setup completed.
echo Next time, run: 2-RUN-JKI.bat
pause
