@echo off
rem ColorLens 개발 서버 시작 (더블클릭용)
rem 백엔드(8002) + 프론트엔드(5176) 실행 후 브라우저 자동 오픈.
rem 포트 충돌/고아 프로세스는 scripts\dev.ps1 이 자동 정리.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev.ps1" -Action start
pause
