@echo off
cd /d "%~dp0"
call npm run build
start "" cmd /c "timeout /t 2 >nul && start "" http://127.0.0.1:5173/"
node server.mjs
pause
