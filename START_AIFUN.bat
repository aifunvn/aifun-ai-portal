@echo off
title AIFUN OS V4 Launcher
color 0A

echo.
echo ============================================
echo           AIFUN OS V4 LAUNCHER
echo ============================================
echo.

cd /d D:\AIFUN-AI-PORTAL

echo [1/4] Checking Python...
python --version
if errorlevel 1 (
    echo.
    echo Python is not installed.
    pause
    exit
)

echo.
echo [2/4] Starting Web Server...

start "" cmd /c "python -m http.server 5500"

timeout /t 2 >nul

echo.
echo [3/4] Opening Browser...

start "" http://localhost:5500/index.html

echo.
echo [4/4] AIFUN OS Started Successfully.
echo.
echo Do not close the Python Server window.
echo.

exit