@echo off
title Stackvil Exam Portal Launcher
cls

:menu
cls
echo ===================================================
echo   Stackvil Online Examination Portal Launcher
echo ===================================================
echo.
echo Please select an option to start:
echo  [1] Start Everything (Backend, Frontend, and Cloudflare Named Tunnel)
echo  [2] Start Cloudflare Named Tunnel Only (https://api.stackvil.com)
echo  [3] Start Development Servers Only (Backend and Frontend)
echo  [4] Deploy to Vercel Production (https://entrance.stackvil.com)
echo  [5] Exit
echo.
set /p opt="Enter choice (1-5): "

if "%opt%"=="1" goto start_all
if "%opt%"=="2" goto start_tunnel
if "%opt%"=="3" goto start_servers
if "%opt%"=="4" goto deploy_production
if "%opt%"=="5" goto exit_launcher
goto invalid_choice

:start_all
echo.
echo Checking and preparing Frontend build...
if not exist "%~dp0stackvil-exam\frontend\dist\index.html" (
    echo Building production frontend...
    cd /d "%~dp0stackvil-exam\frontend"
    call npm run build
    cd /d "%~dp0"
)

echo Starting Stackvil Unified Portal Server (Port 5000)...
start "Stackvil Unified Server" cmd /c "cd /d %~dp0stackvil-exam\backend && node server.js > server.log 2>&1"
ping 127.0.0.1 -n 5 >nul

echo Starting Cloudflare Tunnel (https://entrance.stackvil.com ^& https://api.stackvil.com)...
start "Stackvil Cloudflare Tunnel" cmd /c "cd /d %~dp0 && node start-tunnel.js"
goto exit_launcher

:start_tunnel
echo.
echo Starting Cloudflare Tunnel (https://entrance.stackvil.com ^& https://api.stackvil.com)...
start "Stackvil Cloudflare Tunnel" cmd /c "cd /d %~dp0 && node start-tunnel.js"
goto exit_launcher

:start_servers
echo.
echo Starting Stackvil Unified Portal Server (Port 5000)...
start "Stackvil Unified Server" cmd /c "cd /d %~dp0stackvil-exam\backend && node server.js > server.log 2>&1"
goto exit_launcher

:deploy_production
echo.
if exist "deploy.bat" (
    call deploy.bat
) else (
    echo Deploying to Vercel Production...
    where vercel >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        call vercel --prod
    ) else (
        call npx vercel --prod
    )
    pause
)
goto menu

:invalid_choice
echo.
echo Invalid choice. Please try again.
pause
goto menu

:exit_launcher
echo.
echo Launcher running! You can close this window.
timeout /t 3 >nul
exit

