@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo JKI Taman Firdaus - Stop App
echo ========================================

echo Stopping app process on port 3000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue ^| Select-Object -ExpandProperty OwningProcess -Unique ^| ForEach-Object { Stop-Process -Id $_ -Force }"

echo Stopping PostgreSQL container...
docker compose stop

echo Done.
pause
