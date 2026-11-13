# ColorLens dev server launcher / stopper.
# (한국어) 개발 서버 시작/종료 스크립트 — 포트 충돌·고아 프로세스 자동 정리.
#
# 사용법:
#   시작: AccessUI 실행.bat  (또는)  powershell -File scripts\dev.ps1 -Action start
#   종료: AccessUI 종료.bat  (또는)  powershell -File scripts\dev.ps1 -Action stop
#
# 이번처럼 "포트는 점유 중인데 소유 프로세스가 없는" 좀비 소켓 문제를 막기 위해
# 종료 시 프로세스 트리 전체를 죽이고, 시작 시엔 기존 고아 worker까지 정리한다.
param(
  [ValidateSet('start', 'stop')][string]$Action = 'start'
)

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
# venv(.venv)가 다른 사용자 Python 경로를 참조해 깨진 문제 우회 —
# 시스템 Python(모든 의존성 설치됨)을 직접 사용.
$python = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
if (-not (Test-Path $python)) {
  # 폴백: PATH에서 python 탐색
  $found = Get-Command python -ErrorAction SilentlyContinue
  if ($found) { $python = $found.Source }
}
$ports = 8002, 5176

function Clear-DevPorts {
  # 1) 8002/5176 리스닝 프로세스를 트리(/T)까지 종료 — reload 자식 worker까지 한 번에.
  foreach ($port in $ports) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
      $procId = $_.OwningProcess
      if ($procId -and (Get-Process -Id $procId -ErrorAction SilentlyContinue)) {
        Write-Host "  :$port 점유 PID $procId 종료 (자식 프로세스 포함)" -ForegroundColor DarkGray
        & taskkill /F /T /PID $procId 2>$null | Out-Null
      }
    }
  }
  # 2) 고아 multiprocessing worker 정리 — 부모 reloader가 죽고 자식만 남은 uvicorn 케이스.
  #    (이번에 겪은 좀비 소켓의 원인. cmdline에 multiprocessing-fork/spawn_main이 있고
  #     부모 PID가 이미 없으면 고아로 판정해 종료.)
  Get-CimInstance Win32_Process -Filter "Name='python.exe' OR Name='pythonw.exe'" |
    Where-Object { $_.CommandLine -match 'multiprocessing-fork|spawn_main' } |
    ForEach-Object {
      $ppid = $_.ParentProcessId
      $parentAlive = if ($ppid) { [bool](Get-Process -Id $ppid -ErrorAction SilentlyContinue) } else { $false }
      if (-not $parentAlive) {
        Write-Host "  고아 worker PID $($_.ProcessId) 종료" -ForegroundColor DarkGray
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
      }
    }
  Start-Sleep -Milliseconds 300
}

if ($Action -eq 'stop') {
  Write-Host 'ColorLens 서버 종료 중...' -ForegroundColor Cyan
  Clear-DevPorts
  Write-Host '완료' -ForegroundColor Green
  return
}

# --- start ---
Write-Host 'ColorLens 시작 중...' -ForegroundColor Cyan
Write-Host '[1/2] 포트 정리' -ForegroundColor Cyan
Clear-DevPorts

if (-not (Test-Path $python)) {
  Write-Host "오류: Python을 찾을 수 없습니다. Python 3.12를 설치하세요." -ForegroundColor Red
  exit 1
}

# 의존성(fastapi 등) 설치 여부 확인
& $python -c "import fastapi, uvicorn, sqlalchemy, PIL, numpy, bcrypt" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "오류: 백엔드 의존성이 설치되지 않았습니다. pip install -r backend\requirements.txt 실행 필요" -ForegroundColor Red
  exit 1
}

Write-Host '[2/2] 서버 실행 (각각 새 창)' -ForegroundColor Cyan
# 백엔드: 시스템 Python 으로 uvicorn (reload). 별도 창에서 로그 확인 가능.
Start-Process cmd -ArgumentList "/k", "title ColorLens Backend && cd /d `"$backend`" && `"$python`" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8002"
# 프론트엔드: vite dev (포트 고정 5176).
Start-Process cmd -ArgumentList "/k", "title ColorLens Frontend && cd /d `"$frontend`" && npm run dev -- --port 5176"

Write-Host '서버 준비 대기 중...' -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  $be = Get-NetTCPConnection -LocalPort 8002 -State Listen -ErrorAction SilentlyContinue
  $fe = Get-NetTCPConnection -LocalPort 5176 -State Listen -ErrorAction SilentlyContinue
  if ($be -and $fe) { $ok = $true; break }
}

if ($ok) {
  Write-Host '준비 완료 — 브라우저 열기: http://localhost:5176/' -ForegroundColor Green
  Start-Process 'http://localhost:5176/'
} else {
  Write-Host '경고: 30초 내 서버가 준비되지 않음. 띄워진 창의 로그를 확인하세요.' -ForegroundColor Yellow
}
