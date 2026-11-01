@echo off
rem ColorLens 개발 서버 종료 (더블클릭용)
rem 백엔드·프론트엔드 프로세스 트리를 안전하게 종료 (고아 worker 방지).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev.ps1" -Action stop
pause
