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
echo  [1] Start Everything (Backend, Frontend, and Cloudflare Tunnel)
echo  [2] Start Cloudflare Tunnel Only
echo  [3] Start Development Servers Only (Backend and Frontend)
echo  [4] Exit
echo.
set /p opt="Enter choice (1-4): "

if "%opt%"=="1" goto start_all
if "%opt%"=="2" goto start_tunnel
if "%opt%"=="3" goto start_servers
if "%opt%"=="4" goto exit_launcher
goto invalid_choice

:start_all
echo.
echo Starting Backend Server...
start "Stackvil Backend" cmd /c "npm run backend"
timeout /t 3 >nul

echo Starting Frontend Server...
start "Stackvil Frontend" cmd /c "npm run frontend"
timeout /t 2 >nul

echo Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /c "npm run tunnel"
goto exit_launcher

:start_tunnel
echo.
echo Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /c "npm run tunnel"
goto exit_launcher

:start_servers
echo.
echo Starting Backend Server...
start "Stackvil Backend" cmd /c "npm run backend"
timeout /t 3 >nul

echo Starting Frontend Server...
start "Stackvil Frontend" cmd /c "npm run frontend"
goto exit_launcher

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
