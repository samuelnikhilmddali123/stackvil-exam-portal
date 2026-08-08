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
echo Starting Backend Server...
start "Stackvil Backend" cmd /c "npm run backend"
timeout /t 3 >nul

echo Starting Frontend Server...
start "Stackvil Frontend" cmd /c "npm run frontend"
timeout /t 2 >nul

echo Starting Permanent Cloudflare Tunnel (https://api.stackvil.com)...
start "Cloudflare Named Tunnel" cmd /c "npm run tunnel:backend"
goto exit_launcher

:start_tunnel
echo.
echo Starting Permanent Cloudflare Tunnel (https://api.stackvil.com)...
start "Cloudflare Named Tunnel" cmd /c "npm run tunnel:backend"
goto exit_launcher

:start_servers
echo.
echo Starting Backend Server...
start "Stackvil Backend" cmd /c "npm run backend"
timeout /t 3 >nul

echo Starting Frontend Server...
start "Stackvil Frontend" cmd /c "npm run frontend"
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

