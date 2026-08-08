@echo off
cd /d "%~dp0"

echo ========================================================
echo   Auto-Starting Stackvil Backend & Cloudflare Tunnel...
echo ========================================================

rem Start Backend Server on Port 5000
start "Stackvil Backend Server" /min cmd /c "npm run backend"

timeout /t 3 >nul

rem Start Cloudflare Named Tunnel (https://api.stackvil.com)
start "Stackvil Cloudflare Tunnel" /min cmd /c "cloudflared tunnel run stackvil-backend"

exit
