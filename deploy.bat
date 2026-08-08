@echo off
title Stackvil Exam Portal - Vercel Production Deployment
cls

echo =========================================================
echo   Stackvil Online Examination Portal - Production Deploy
echo =========================================================
echo Target Production Domain: https://entrance.stackvil.com
echo Command: vercel --prod
echo.

rem Execute vercel --prod directly (with npx fallback if vercel command is not in PATH)
where vercel >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    call vercel --prod
) else (
    call npx vercel --prod
)

rem Capture execution status and display clean result banner
if %ERRORLEVEL% EQU 0 (
    echo.
    echo =========================================================
    echo [SUCCESS] Deployment to Vercel Production completed!
    echo Live Production URL: https://entrance.stackvil.com
    echo =========================================================
) else (
    echo.
    echo =========================================================
    echo [ERROR] Deployment failed with exit code: %ERRORLEVEL%
    echo Please review the logs above for details.
    echo =========================================================
)

echo.
pause
