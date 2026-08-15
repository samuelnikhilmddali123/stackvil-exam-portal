@echo off
title Stackvil Portal - AutoStart Manager
cls

echo ========================================================
echo   Stackvil Portal - Windows AutoStart Setup
echo ========================================================
echo.
echo This utility configures your backend server and Cloudflare
echo Tunnel to start automatically whenever your PC boots up.
echo.
echo Target Files:
echo  - Script: %~dp0auto-start-server.bat
echo  - Startup Folder: %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
echo.

if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Stackvil-Portal-AutoStart.vbs" (
    echo [STATUS] AutoStart is currently INSTALLED and ACTIVE.
) else (
    echo [STATUS] AutoStart is currently NOT installed.
)

echo.
echo Select an option:
echo  [1] Enable / Install AutoStart on PC Boot
echo  [2] Disable / Remove AutoStart
echo  [3] Test Run AutoStart Now
echo  [4] Exit
echo.
set /p opt="Enter choice (1-4): "

if "%opt%"=="1" goto enable_autostart
if "%opt%"=="2" goto disable_autostart
if "%opt%"=="3" goto test_autostart
if "%opt%"=="4" goto exit_mgr
goto invalid_choice

:enable_autostart
echo.
echo Configuring and Installing AutoStart shortcut...

echo Set WshShell = CreateObject^("WScript.Shell"^)> "%~dp0Stackvil-Portal-AutoStart.vbs"
echo WshShell.Run """%~dp0auto-start-server.bat""", 0, False>> "%~dp0Stackvil-Portal-AutoStart.vbs"

copy /y "%~dp0Stackvil-Portal-AutoStart.vbs" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Stackvil-Portal-AutoStart.vbs" >nul
echo.
echo [SUCCESS] AutoStart enabled!
echo Backend Server & Cloudflare Tunnel will start automatically whenever your PC turns on.
echo.
pause
goto exit_mgr

:disable_autostart
echo.
echo Removing AutoStart shortcut...
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Stackvil-Portal-AutoStart.vbs" (
    del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Stackvil-Portal-AutoStart.vbs" >nul
)
echo [SUCCESS] AutoStart disabled.
echo.
pause
goto exit_mgr

:test_autostart
echo.
echo Launching AutoStart test run...
call "%~dp0auto-start-server.bat"
echo [SUCCESS] AutoStart background processes launched!
echo.
pause
goto exit_mgr

:invalid_choice
echo Invalid choice.
pause
goto exit_mgr

:exit_mgr
exit
