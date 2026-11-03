# ColorLens - Claude Code Configuration

웹 UI가 색각이상 사용자에게 어떻게 보이는지 시뮬레이션하고 접근성 문제를 진단·개선하는 웹 서비스.
사용자 모드: 화면 캡처 이미지(PNG/JPG, 10MB 이하)를 업로드하고 적·녹·청 색약 유형을 선택하면 원본과 시뮬레이션 결과를 나란히 보여주고 결과 내용을 요약한다.
개발자 모드: 화면 이미지 또는 HTML/CSS 코드를 분석해 요소별 상세 결과와 문제 해결 방법 카드, 요약을 제공한다.
분석: 주요 색상 추출, 색상 구분 가능성, WCAG 대비율 검사, PASS/WARNING/FAIL 판정, 접근성 점수, 대체 색상 추천과 재검증.
처리 흐름: 프론트엔드가 이미지와 선택한 색약 유형을 백엔드로 보내면, 백엔드(Python FastAPI)가 Pillow로 시뮬레이션과 색상 분석을 처리해 결과 이미지와 분석 결과를 돌려준다. 백엔드는 AI 설명·번역 API 호출도 담당한다. 업로드 이미지는 분석 후 서버에 저장하지 않는다.
공통: 로그인·회원가입, 마이페이지(내 정보, 결과 내역), Kr/En 전환.
저장 정책은 로그인 여부에 따라 다르다. 비로그인 사용자의 분석 결과·이미지는 메모리에서만 처리하고 저장하지 않는다(새로고침 시 소멸). 로그인 사용자의 분석 결과는 SQLite DB에 영속화해 히스토리·캐시·통계로 활용한다. 회원가입·로그인·사용자 API를 백엔드에 구현하고, 비밀번호는 bcrypt로 해시해 저장한다. 업로드 이미지 바이트는 로그인 여부와 무관하게 DB·디스크에 저장하지 않고 메모리(BytesIO)에서만 처리한다(캐시 키로 이미지 해시만 저장).

---

## Language Settings

- **Default Response**: Korean
- **Code Comments**: English
- **Commit Messages**: English (Conventional Commits)
- **Documentation**: Korean + English technical terms

---

## Project Overview

| Property | Value |
|----------|-------|
| **Type** | web (Single Page Application) |
| **Tier** | standard |
| **Team** | 3인 (프론트엔드 / 접근성 분석 / 백엔드), 2~3개월, 학교 팀 프로젝트 |
| **Created** | 2026-09-22 |

---

## Tech Stack

| Component | Technology | Framework/Library |
|-----------|------------|-------------------|
| **Backend** | Python 3.12 | FastAPI, Pillow, NumPy, httpx |
| **Frontend** | React + TypeScript | Vite, TailwindCSS, React Router |
| **State** | Zustand | persist 미들웨어 사용 금지 |
| **Database** | SQLite (WAL) | SQLAlchemy 2.0 ORM, bcrypt(직접) |
| **Infrastructure** | 없음 | - |

---

## Project Structure

```
access-ui/
├── .claude/CLAUDE.md
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, routers, DB init, static serving
│   │   ├── config.py          # 설정·임계값·DATABASE_URL·STATIC_DIR
│   │   ├── database.py        # SQLite 엔진·세션·WAL pragma
│   │   ├── models.py          # User, AnalysisResult, AnalysisCache ORM
│   │   ├── schemas.py         # Pydantic 모델
│   │   ├── routers/           # analysis, developer, ai, auth
│   │   └── services/          # cvd, color, wcag, palette, recommend, scoring, analyzer, ai_client, persistence, security
│   └── tests/
├── frontend/
│   └── src/
│       ├── api/  components/  pages/  stores/  i18n/  utils/
├── docs/
├── config/project.yml
├── .planning/
└── README.md
```

---

## Development Commands

```bash
# Backend
cd backend && uvicorn app.main:app --reload --port 8002
cd backend && pytest

# Frontend
cd frontend && npm run dev
cd frontend && npm run build
```

---

## Project Rules (반드시 지킬 것)

1. **저장 정책 (로그인 여부 차등)**: 비로그인 사용자의 분석 결과는 메모리에서만 유지하고 저장하지 않는다(새로고침·로그아웃 시 소멸). 로그인 사용자의 분석 결과는 SQLite DB에 영속화한다(히스토리·캐시·통계). 인증 토큰·세션은 메모리에서만 다루고 브라우저 저장소(localStorage/sessionStorage/쿠키)에는 쓰지 않는다. Zustand `persist` 미들웨어는 쓰지 않는다.
2. **회원 관리**: 백엔드에 회원가입·로그인·사용자 API를 FastAPI + SQLAlchemy로 구현한다. 비밀번호는 bcrypt로 해시해 저장하고 평문으로 보관하지 않는다. 인가는 서버 메모리 세션 토큰(in-memory opaque token) 기반 — user_id를 URL 경로로 받지 않고 `Authorization: Bearer` 헤더에서 추출해 본인만 접근 가능. 토큰은 서버 메모리에만 저장(서버 재시작 시 소멸, 영속 세션 금지).
3. **이미지 비저장**: 업로드 이미지 바이트는 `BytesIO`로만 처리하고 DB·디스크에 쓰지 않는다(로그인 여부 무관). 캐시 키로만 이미지 해시(SHA-256)를 저장한다. 로그에도 이미지 내용을 남기지 않는다.
4. **AI 역할 분리**: AI는 수치를 계산하지 않고 알고리즘 결과를 설명·번역만 한다. AI가 없어도(키 미설정·호출 실패) 핵심 분석은 동작해야 한다. AI가 제시한 색은 다시 검증 후 표시한다.
5. **알고리즘 기준**: 시뮬레이션은 Machado(2009) 행렬을 선형 RGB에 적용, 색상 거리는 OKLab ΔE(Ottosson 2020; 단순 유클리드 거리로 CIEDE2000급 지각 균일성), WCAG AA(일반 4.5:1, 큰 텍스트 3:1, UI 3:1). OKLab이 지각 균일해 절대 ΔE만으로 혼동 판정(비율 기반 꼼수 불필요). ΔE 판정 임계값(DISTINCT_MIN=0.10, CONFUSION_FAIL=0.05, CONFUSION_WARN=0.08)은 14개 실제 UI 색쌍으로 검증 완료(100% 일치, scripts/tune_thresholds.py).
6. **재검증**: 추천 색상은 대비율과 색각이상 변환 후 구분 가능성을 다시 검사해 통과한 것만 반환한다.
7. **화면 규칙**: 사용자 모드에는 "문제 해결 방법/요약" 영역을 만들지 않는다(개발자 모드 전용). 접근성 점수 옆에 "자체 지표, 공식 WCAG 점수 아님" 문구를 표시한다.
8. **서비스 자체 접근성**: 선택 상태·PASS/WARNING/FAIL을 색만으로 표시하지 않고 아이콘·텍스트를 함께 쓴다. 키보드 조작과 대체 텍스트를 지원한다.
9. **입력 HTML 비실행**: 개발자 모드 HTML은 script·이벤트 속성을 제거하고 스크립트 비허용 sandbox iframe에서만 렌더링한다.
10. 핵심 알고리즘 코드(cvd, color, wcag, recommend)는 팀원이 설명할 수 있어야 하며, 테스트 없이 수정하지 않는다.

---

## Safety Rules

### Dangerous Commands (Require User Confirmation)

| Command | Risk | Description |
|---------|------|-------------|
| `rm -rf` | HIGH | Recursive force delete |
| `git reset --hard` | HIGH | Discard uncommitted changes |

---

## Forbidden Actions

- Direct push to main/develop branch
- Hardcoded secrets/API keys (ANTHROPIC_API_KEY는 backend/.env에만)
- 비밀번호 평문 저장 (반드시 bcrypt 해시, rounds=12). user_id를 URL 경로로 받는 인가 방식 금지 (토큰에서 추출). JWT·영속 세션·세션 쿠키 사용 금지 (in-memory 세션 토큰만 허용)
- 업로드 이미지 바이트를 DB·디스크·로그에 저장 (SHA-256 해시만 캐시 키로 허용)
- 비로그인 사용자의 분석 결과를 DB에 저장 (저장은 로그인 사용자만)
- localStorage / sessionStorage / Zustand persist 사용 (인증·결과는 메모리 또는 백엔드 DB만)
- Execute dangerous commands without confirmation

---

**Profile**: web/spa | **Updated**: 2026-09-22
