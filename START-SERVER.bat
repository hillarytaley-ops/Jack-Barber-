@echo off
title Jack's Barber Style Server
cd /d "%~dp0"
echo.
echo Starting Jack's Barber Style...
echo.
echo   Website:  http://localhost:3000
echo   Admin:    http://localhost:3000/admin/
echo.
echo   Login: admin / JackStyle2026
echo.
echo Press Ctrl+C to stop.
echo.
node server\server.js
pause
