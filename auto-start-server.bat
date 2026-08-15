@echo off
cd /d "%~dp0"

echo ========================================================
echo   Auto-Starting Stackvil Portal and Cloudflare Tunnel...
echo ========================================================

rem Build production frontend bundle if missing
if not exist "stackvil-exam\frontend\dist\index.html" (
    echo Building frontend production bundle...
    cd stackvil-exam\frontend
    call npm run build
    cd /d "%~dp0"
)

rem Start Unified Server on Port 5000 (serves Backend API + WebSockets + React Frontend)
start "Stackvil Portal Unified Server" /min cmd /c "cd /d %~dp0stackvil-exam\backend && node server.js"

ping 127.0.0.1 -n 5 >nul

rem Start Cloudflare Tunnel (Routes Cloudflare domain to port 5000)
start "Stackvil Cloudflare Tunnel" /min cmd /c "cd /d %~dp0 && node start-tunnel.js"

exit
