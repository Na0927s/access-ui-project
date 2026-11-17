# CVDS(COLOR VISION DEFICIENCY SIMULATOR)

웹 UI가 색각이상 사용자에게 어떻게 보이는지 시뮬레이션하고 접근성 문제를 진단·개선하는 웹 서비스.

> 🔗 **배포(데모)**: <https://access-ui-project.onrender.com>
> (Render 무료 티어 — 최초 접속 시 cold start로 수십 초가 걸릴 수 있습니다.)

## 목차

- [개요](#개요)
- [주요 기능](#주요-기능)
- [아키텍처](#아키텍처)
- [설계 원칙 및 제약](#설계-원칙-및-제약)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [실행](#-실행)
  - [빠른 시작 (Windows)](#-빠른-시작-windows--더블클릭-실행-권장)
  - [수동 실행](#수동-실행)
- [배포 (Deployment)](#-배포-deployment)
- [API 문서](#api-문서)

## 개요

CVDS(COLOR VISION DEFICIENCY SIMULATOR)는 화면 캡처 이미지나 HTML/CSS 코드를 입력받아, 색각이상(적·녹·청 색맹) 사용자에게 화면이 어떻게 보이는지 시뮬레이션하고 접근성 문제를 진단·개선 방법까지 제안하는 웹 서비스입니다. 일반 사용자는 시뮬레이션 비교와 쉬운 설명을, 개발자는 요소별 상세 분석과 색상 추천까지 얻을 수 있습니다.

## 주요 기능

| 모드 | 입력 | 제공하는 것 |
|------|------|-------------|
| **사용자 모드** | 화면 캡처 이미지 (PNG/JPG, 10MB 이하) + 색약 유형 | 원본·시뮬레이션 나란히 비교, 일반인도 이해하기 쉬운 설명 (왜 겹쳐 보이는지) |
| **개발자 모드** | 화면 이미지 **또는** HTML/CSS 코드 | 요소별 상세 결과, 문제 해결 방법 카드 (색상 대비·색 추천), 요약 |
| **공통** | — | 회원가입·로그인, 마이페이지 (내 정보·결과 내역), Kr/En 전환 |

**분석 내용**: 주요 색상 추출, 색상 구분 가능성, WCAG 대비율 검사, PASS/WARNING/FAIL 판정, 대체 색상 추천과 재검증. (접근성 점수는 폐지 — 판정과 설명만 제공.)

## 아키텍처

### 처리 흐름

프론트엔드가 이미지와 선택한 색약 유형을 백엔드로 보내면, 백엔드(Python FastAPI)가 Pillow로 시뮬레이션과 색상 분석을 처리해 결과 이미지와 분석 결과를 돌려준다. 백엔드는 AI 설명·번역 API 호출도 담당한다. 업로드 이미지는 분석 후 서버에 저장하지 않는다.

```
┌─────────────┐     이미지 + 색약 유형      ┌──────────────────────────┐
│  사용자     │ ─────────────────────────▶ │  프론트엔드 (React SPA)   │
└─────────────┘                            └──────────────┬───────────┘
                                                          │  POST /api/...
                                                          ▼
                                           ┌──────────────────────────┐
                                           │  백엔드 (FastAPI)         │
                                           │  ┌────────────────────┐  │
                                           │  │ 1. CVD 시뮬레이션   │  │  Machado 2009 행렬 → 선형 RGB
                                           │  ├────────────────────┤  │
                                           │  │ 2. 색상 분석        │  │  OKLab ΔE + WCAG 대비율
                                           │  ├────────────────────┤  │
                                           │  │ 3. 추천 색상 + 재검증│  │  판정 통과한 후보만 반환
                                           │  ├────────────────────┤  │
                                           │  │ 4. AI 설명·번역     │  │  선택 — 키 없어도 동작
                                           │  └────────────────────┘  │
                                           └──────────────┬───────────┘
                                                          │  결과 이미지 + 분석 JSON
                                                          ▼
                                           ┌──────────────────────────┐
                                           │  프론트엔드 표시          │
                                           └──────────────────────────┘
```

### 저장 정책 (로그인 여부에 따라 차등)

| 항목 | 비로그인 사용자 | 로그인 사용자 |
|------|-----------------|---------------|
| **분석 결과** | 메모리에서만 처리 (새로고침·로그아웃 시 소멸) | SQLite DB에 영속화 (히스토리·캐시·통계) |
| **업로드 이미지 바이트** | 메모리(BytesIO)만 — DB·디스크·로그에 저장 안 함 | 동일 (로그인 여부 무관) |
| **캐시 키** | — | 이미지 해시(SHA-256)만 저장 |
| **인증 세션** | — | 서버 메모리(in-memory opaque token) — 브라우저 저장소 미사용, 서버 재시작 시 소멸 |
| **비밀번호** | — | bcrypt(rounds=12) 해시 저장 |

## 설계 원칙 및 제약

- 인증은 서버 메모리 세션 토큰 기반 — `user_id`를 URL 경로로 받지 않고 `Authorization: Bearer` 헤더에서 추출해 본인만 접근. JWT·영속 세션·세션 쿠키 사용 금지.
- 비로그인 사용자의 분석 결과를 DB에 저장하지 않는다 (저장은 로그인 사용자만).
- `localStorage` / `sessionStorage` / Zustand `persist` 사용 금지 (인증·결과는 메모리 또는 백엔드 DB만).
- 업로드 이미지 바이트를 DB·디스크·로그에 저장하지 않는다 (SHA-256 해시만 캐시 키로 허용).
- AI는 수치를 계산하지 않고 알고리즘 결과를 설명·번역만 한다. AI 키가 없어도 핵심 분석은 동작한다.
- 접근성 점수는 폐지했다. PASS/WARNING/FAIL 판정과 설명만 제공하며, 자체 지표 고지 문구도 표시하지 않는다.
- 선택 상태·PASS/WARNING/FAIL을 색만으로 표시하지 않고 아이콘·텍스트를 함께 쓴다. 키보드 조작과 대체 텍스트를 지원한다.

## 기술 스택

- **Backend**: Python 3.12 / FastAPI / Pillow + NumPy / SQLAlchemy 2.0 / bcrypt
- **Frontend**: React + TypeScript (Vite) / TailwindCSS / Zustand (persist 미사용)
- **Database**: SQLite (WAL 모드)
- **Type**: Web Application — Single Page Application
- **Infrastructure**: [Render](https://render.com) (Web Service — 단일 서비스로 백엔드 + 빌드된 프론트엔드 정적 서빙)

## 프로젝트 구조

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
├── scripts/                    # dev.ps1 — 서버 시작/종료 스크림트
├── docs/                       # Project documentation + dev-log
├── config/                     # Configuration files
├── .planning/                  # GSD workflow files
├── .claude/                    # Claude Code 설정
├── build.sh                    # Render 빌드 스크립트 (백엔드 의존성 + 프론트 빌드)
├── AccessUI 실행.bat           # 서버 시작 (더블클릭)
├── AccessUI 종료.bat           # 서버 종료 (더블클릭)
└── README.md
```

## 🚀 실행

### 🚀 빠른 시작 (Windows — 더블클릭 실행 권장)

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

## 🚀 배포 (Deployment)

프로젝트는 Render에 단일 Web Service로 배포한다. 백엔드(FastAPI)가 빌드된 프론트엔드 정적 파일까지 함께 서빙한다.

**배포 URL**: <https://access-ui-project.onrender.com>

### 배포 구성

Render 대시보드에서 아래와 같이 Web Service를 생성한다 (또는 `render.yaml`의 Blueprint 사용).

| 항목 | 값 |
|------|------|
| **Runtime** | Python 3 |
| **Build Command** | `./build.sh` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Root Directory** | (repo 루트) |
| **Health Check Path** | `/api/health` |

> `build.sh`는 루트에 위치하며: 백엔드 의존성 설치 → 프론트엔드 빌드 → `frontend/dist`를 백엔드가 서빙하도록 `STATIC_DIR` 경로에 복사한다.

### 환경 변수 (Environment Variables)

Render 대시보드의 **Environment**에서 설정. `backend/.env.example`과 동일한 키.

| Key | 값 (배포용 예시) | 비고 |
|-----|------------------|------|
| `ANTHROPIC_API_KEY` | (발급받은 키) | 생략 시 AI 설명·번역 기능만 비활성화, 핵심 분석은 정상 동작 |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | |
| `ALLOWED_ORIGINS` | `https://access-ui-project.onrender.com` | CORS 허용 출처 (프론트 도메인) |
| `DATABASE_URL` | `sqlite:////var/data/colorlens.db` | Render 영구 디스크(`/var/data`) 마운트 시 |
| `STATIC_DIR` | `frontend/dist` (또는 빌드 산출물 경로) | 백엔드가 정적 파일(프론트)을 서빙할 경로 |

### 영구 디스크 (Persisted Disk)

- SQLite DB 파일을 보존하려면 Render Web Service에 **Disk**를 추가한다.
  - **Mount Path**: `/var/data`
  - **Size**: 1 GB (무료 티어 기준, 충분함)
- `DATABASE_URL`을 `sqlite:////var/data/colorlens.db`로 설정하면 재배포·재시작 후에도 로그인 사용자의 분석 히스토리가 유지된다.
- 디스크가 없으면 서버 재시작마다 DB가 초기화된다 (비로그인 분석은 어차피 메모리만 쓰므로 영향 없음).

### Render 배포 특이사항

- **Cold Start**: 무료 티어는 일정 시간 트래픽이 없으면 서버가 sleep 상태가 된다. 최초 접속 시 기상(wake)에 수십 초가 소요될 수 있다.
- **서버 메모리 세션**: 인증 세션은 서버 메모리(in-memory)에만 저장하므로, 재배포·재시작 시 모든 로그인 세션이 소멸한다 (사용자는 다시 로그인해야 함). 이는 의도된 동작이다.
- **업로드 이미지 비저장**: 업로드 이미지는 메모리(BytesIO)에서만 처리되고 디스크·DB에 저장되지 않으므로, 디스크 용량을 소비하지 않는다.

## API 문서

### Base URL

| 환경 | URL |
|------|-----|
| 로컬 개발 | `http://localhost:8002` |
| 배포 (Render) | `https://access-ui-project.onrender.com` |

### 분석 API

#### `POST /api/analysis/image` — 이미지 분석

화면 캡처 이미지를 업로드해 시뮬레이션·색상 분석·추천 색상을 받는다.

| 항목 | 내용 |
|------|------|
| **Content-Type** | `multipart/form-data` |
| **인증** | 선택 — `Authorization: Bearer <token>` (로그인 시 결과가 DB에 저장됨) |

**요청 파라미터 (Form)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `file` | File | ✅ | 이미지 파일 (PNG/JPG, 10MB 이하) |
| `cvd_type` | string | ✅ | 색약 유형: `protan` / `deutan` / `tritan` |
| `mode` | string | ❌ | `user` (기본) / `developer` |
| `lang` | string | ❌ | `ko` (기본) / `en` |

**응답 (200)** — `ImageAnalysis`

```json
{
  "verdict": "WARNING",
  "simulated_image": "data:image/png;base64,...",
  "cvd_type": "deutan",
  "palette": [{ "hex": "#3b82f6", "ratio": 0.42 }],
  "issues": [
    { "id": 1, "severity": "HIGH", "colors": ["#3b82f6", "#1e3a8a"], "message": "..." }
  ],
  "recommendations": [
    { "current": "#3b82f6", "against": "#1e3a8a", "candidates": [{ "hex": "#2563eb", "grade": "STRONG" }] }
  ]
}
```

#### `POST /api/developer/analyze` — 코드 분석

HTML/CSS에서 추출한 요소 목록을 받아 요소별 대비 검사·문제 해결 카드를 생성한다.

| 항목 | 내용 |
|------|------|
| **Content-Type** | `application/json` |
| **인증** | 선택 — `Authorization: Bearer <token>` |

**요청 본문 (JSON)**

```json
{
  "cvd_type": "deutan",
  "lang": "ko",
  "elements": [
    {
      "selector": "button.primary",
      "text": "확인",
      "color": "#ffffff",
      "background": "#3b82f6",
      "font_size_px": 16,
      "font_weight": 400
    }
  ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `cvd_type` | string | ✅ | `protan` / `deutan` / `tritan` |
| `lang` | string | ❌ | `ko` (기본) / `en` |
| `elements` | array | ✅ | 분석할 요소 목록 (1~500개) |
| `elements[].selector` | string | ✅ | CSS 선택자 (최대 300자) |
| `elements[].text` | string | ❌ | 요소에 담긴 텍스트 (최대 500자) |
| `elements[].color` | string | ✅ | 글자색 `#RRGGBB` |
| `elements[].background` | string | ✅ | 배경색 `#RRGGBB` |
| `elements[].font_size_px` | number | ❌ | 폰트 크기(px) — 큰 텍스트 판정에 사용 |
| `elements[].font_weight` | number | ❌ | 폰트 굵기 — bold(700+) 판정에 사용 |

**응답 (200)** — `DeveloperAnalysis`

```json
{
  "verdict": "FAIL",
  "result_message": "...",
  "summary": { "total": 6, "pass": 2, "warning": 1, "fail": 3 },
  "results": [
    { "selector": "button.primary", "color": "#ffffff", "background": "#3b82f6", "verdict": "FAIL", "is_large_text": false }
  ],
  "solution_boxes": [{ "selector": "button.primary" }]
}
```

### 인증 API (`/api/auth`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| `POST` | `/signup` | 회원가입 (중복 ID/이메일 거부) | ❌ |
| `POST` | `/check-id` | ID 중복 확인 | ❌ |
| `POST` | `/login` | 로그인 — 사용자 정보 + 세션 토큰 반환 | ❌ |
| `POST` | `/logout` | 로그아웃 (서버 메모리 세션 삭제) | ✅ |
| `GET` | `/me` | 내 정보 조회 | ✅ |
| `PUT` | `/me` | 내 정보 수정 | ✅ |
| `PUT` | `/me/password` | 비밀번호 변경 | ✅ |
| `GET` | `/history` | 분석 결과 히스토리 | ✅ |
| `DELETE` | `/history/{result_id}` | 히스토리 항목 삭제 | ✅ |
| `DELETE` | `/me` | 회원 탈퇴 | ✅ |

> 토큰은 서버 메모리(in-memory)에만 저장됩니다. 서버 재시작 시 모든 세션이 소멸합니다.

### 헬스체크

#### `GET /api/health`

```json
{ "status": "ok", "ai_enabled": true }
```

### 대화형 문서 (Swagger UI)

대화형 API 문서는 백엔드 실행 후 확인할 수 있습니다:

- 로컬: <http://localhost:8002/docs>
- 배포: <https://access-ui-project.onrender.com/docs>

추가 프로젝트 문서는 `docs/` 디렉터리를 참고하세요.

- **Tier**: standard
- **Type**: web / spa

---

Created: 2026-09-22 · Updated: 2026-11-17
