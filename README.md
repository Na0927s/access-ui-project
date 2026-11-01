# ColorLens

웹 UI가 색각이상 사용자에게 어떻게 보이는지 시뮬레이션하고 접근성 문제를 진단·개선하는 웹 서비스.

- **사용자 모드**: 화면 캡처 이미지(PNG/JPG, 10MB 이하)를 업로드하고 적·녹·청 색약 유형을 선택하면 원본과 시뮬레이션 결과를 나란히 보여주고 결과를 요약한다.
- **개발자 모드**: 화면 이미지 또는 HTML/CSS 코드를 분석해 요소별 상세 결과와 문제 해결 방법 카드, 요약을 제공한다.
- **분석**: 주요 색상 추출, 색상 구분 가능성, WCAG 대비율 검사, PASS/WARNING/FAIL 판정, 접근성 점수, 대체 색상 추천과 재검증.
- **처리 흐름**: 프론트엔드가 이미지와 선택한 색약 유형을 백엔드로 보내면, 백엔드(Python FastAPI)가 Pillow로 시뮬레이션과 색상 분석을 처리해 결과 이미지와 분석 결과를 돌려준다. 백엔드는 AI 설명·번역 API 호출도 담당한다. 업로드 이미지는 분석 후 서버에 저장하지 않는다.
- **공통**: 회원가입·로그인, 마이페이지(내 정보, 결과 내역), Kr/En 전환.

## 저장 정책 (로그인 여부에 따라 차등)

- **비로그인 사용자**의 분석 결과·이미지는 메모리에서만 처리하고 저장하지 않는다. 새로고침·로그아웃 시 소멸한다.
- **로그인 사용자**의 분석 결과는 SQLite DB에 영속화해 히스토리·캐시·통계로 활용한다.
- 인증 토큰·세션은 서버 메모리(in-memory opaque token)에만 저장하고 브라우저 저장소(localStorage/sessionStorage/쿠키)에는 쓰지 않는다. 서버 재시작 시 세션은 소멸한다.
- 업로드 이미지 바이트는 로그인 여부와 무관하게 DB·디스크·로그에 저장하지 않고 메모리(BytesIO)에서만 처리한다. 캐시 키로만 이미지 해시(SHA-256)를 저장한다.
- 비밀번호는 bcrypt(rounds=12)로 해시해 저장한다.

## Tech Stack

- **Backend**: Python 3.12 / FastAPI / Pillow + NumPy / SQLAlchemy 2.0 / bcrypt
- **Frontend**: React + TypeScript (Vite) / TailwindCSS / Zustand (persist 미사용)
- **Database**: SQLite (WAL 모드)
- **Type**: Web Application — Single Page Application
- **Infrastructure**: 없음

## Quick Start

### Windows — 더블클릭 실행 (권장)

최초 1회만 의존성 설치:

```powershell
cd backend; .\.venv\Scripts\Activate.ps1   # 없으면: python -m venv .venv
pip install -r requirements.txt
cd ..\frontend; npm install
```

이후부터는 프로젝트 루트의 배치 파일을 더블클릭:

- **`AccessUI 실행.bat`** — 백엔드(8002) + 프론트엔드(5176) 실행 후 브라우저 자동 오픈. 포트 충돌·고아 프로세스 자동 정리.
- **`AccessUI 종료.bat`** — 두 서버를 프로세스 트리째 안전 종료 (uvicorn `--reload` 자식 worker 고아화 방지).

### 수동 실행

```bash
# 1) Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # AI 기능을 쓸 경우 ANTHROPIC_API_KEY 입력 (없어도 핵심 분석은 동작)
uvicorn app.main:app --reload --port 8002

# 2) Frontend (새 터미널)
cd frontend
npm install
npm run dev -- --port 5176         # http://localhost:5176

# 테스트
cd backend && pytest
```

API 문서는 백엔드 실행 후 http://localhost:8002/docs 에서 확인할 수 있습니다.

## Documentation

See `docs/` directory for project documentation.

- **Tier**: standard
- **Type**: web / spa

## Project Structure

```
access-ui/
├── backend/                    # FastAPI + Pillow 분석 서버
│   ├── app/
│   │   ├── main.py             # FastAPI app, CORS, routers, DB init, static serving
│   │   ├── config.py           # 설정·임계값·DATABASE_URL·STATIC_DIR
│   │   ├── database.py         # SQLite 엔진·세션·WAL pragma
│   │   ├── models.py           # User, AnalysisResult, AnalysisCache ORM
│   │   ├── schemas.py          # Pydantic 모델
│   │   ├── routers/            # analysis, developer, ai, auth
│   │   └── services/           # cvd, color, wcag, palette, recommend, scoring, analyzer, ai_client, persistence, security, session, texts
│   └── tests/
├── frontend/                   # React SPA (Zustand, persist 미사용)
│   └── src/
│       ├── api/  components/  pages/  stores/  i18n/  utils/
├── scripts/                    # dev.ps1 — 서버 시작/종료 스크립트
├── docs/                       # Project documentation + dev-log
├── config/                     # Configuration files
├── .planning/                  # GSD workflow files
├── .claude/                    # Claude Code 설정
├── AccessUI 실행.bat           # 서버 시작 (더블클릭)
├── AccessUI 종료.bat           # 서버 종료 (더블클릭)
└── README.md
```

## 핵심 제약

- 인증은 서버 메모리 세션 토큰 기반 — `user_id`를 URL 경로로 받지 않고 `Authorization: Bearer` 헤더에서 추출해 본인만 접근. JWT·영속 세션·세션 쿠키 사용 금지.
- 비로그인 사용자의 분석 결과를 DB에 저장하지 않는다 (저장은 로그인 사용자만).
- `localStorage` / `sessionStorage` / Zustand `persist` 사용 금지 (인증·결과는 메모리 또는 백엔드 DB만).
- 업로드 이미지 바이트를 DB·디스크·로그에 저장하지 않는다 (SHA-256 해시만 캐시 키로 허용).
- AI는 수치를 계산하지 않고 알고리즘 결과를 설명·번역만 한다. AI 키가 없어도 핵심 분석은 동작한다.
- 접근성 점수는 자체 지표이며 공식 WCAG 인증 점수가 아니다.

---

Created: 2026-09-22
