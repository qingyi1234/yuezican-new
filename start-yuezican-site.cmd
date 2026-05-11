@echo off
cd /d "%~dp0"
call npm run build
start "" cmd /c "timeout /t 2 >nul && start "" http://localhost:5173/"
node server.mjs
pause
