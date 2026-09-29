@echo off

rem Use the directory this .bat file lives in as the project root
set "PROJECT=%~dp0"

echo Access UI starting...

start "Access UI Backend" cmd /k "cd /d "%PROJECT%\backend" && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8002"

start "Access UI Frontend" cmd /k "cd /d "%PROJECT%\frontend" && npm run dev -- --port 5176"

timeout /t 5 /nobreak >nul

start http://localhost:5176/

echo Done!