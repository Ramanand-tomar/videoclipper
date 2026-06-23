@echo off
title VideoClipper Local Dev Server Launcher
echo =======================================================================
echo   Starting VideoClipper AI Shortener and YouTube Publisher...
echo   Working Directory: %~dp0
echo =======================================================================
echo.

:: Change directory to the folder containing this batch script
cd /d "%~dp0"

:: Launch local browser to the app URL
echo Opening http://localhost:3000 in your browser...
start http://localhost:3000

:: Start the Next.js development server
echo Running 'npm run dev'...
npm run dev

pause
