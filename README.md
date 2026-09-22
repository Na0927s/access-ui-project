# Access Ui

웹 UI가 색각이상 사용자에게 어떻게 보이는지 시뮬레이션하고 접근성 문제를 진단·개선하는 웹 서비스.
사용자 모드: 화면 캡처 이미지(PNG/JPG, 10MB 이하)를 업로드하고 적·녹·청 색약 유형을 선택하면 원본과 시뮬레이션 결과를 나란히 보여주고 결과 내용을 요약한다.
개발자 모드: 화면 이미지 또는 HTML/CSS 코드를 분석해 요소별 상세 결과와 문제 해결 방법 카드, 요약을 제공한다.
분석: 주요 색상 추출, 색상 구분 가능성, WCAG 대비율 검사, PASS/WARNING/FAIL 판정, 접근성 점수, 대체 색상 추천과 재검증.
처리 흐름: 프론트엔드가 이미지와 선택한 색약 유형을 백엔드로 보내면, 백엔드(Python FastAPI)가 Pillow로 시뮬레이션과 색상 분석을 처리해 결과 이미지와 분석 결과를 돌려준다. 백엔드는 AI 설명·번역 API 호출도 담당한다. 업로드 이미지는 분석 후 서버에 저장하지 않는다.
공통: 로그인·회원가입, 마이페이지(내 정보, 결과 내역), Kr/En 전환.
로그인 정보와 분석 결과는 DB나 서버에 저장하지 않고 프론트엔드 상태에서만 임시로 유지하며, 새로고침이나 로그아웃 시 사라진다. 백엔드에는 회원 관리 기능을 만들지 않는다.

## Tech Stack

- **Backend**: Python 3.12 / FastAPI / Pillow + NumPy
- **Frontend**: React + TypeScript (Vite) / TailwindCSS / Zustand
- **Type**: Web Application — Single Page Application
- **Database**: 없음 (사용하지 않음)
- **Infrastructure**: 없음 (선택하지 않음)

## Quick Start

```bash
# 1) Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # AI 기능을 쓸 경우 ANTHROPIC_API_KEY 입력 (없어도 핵심 분석은 동작)
uvicorn app.main:app --reload --port 8000

# 2) Frontend (새 터미널)
cd frontend
npm install
npm run dev                        # http://localhost:5173

# 테스트
cd backend && pytest
```

API 문서는 백엔드 실행 후 http://localhost:8000/docs 에서 확인할 수 있습니다.

## Documentation

See `docs/` directory for project documentation.

- **Tier**: standard (10 documents)
- **Type**: web / spa

## Project Structure

```
access-ui/
├── backend/        # FastAPI + Pillow 분석 서버 (DB 없음, 파일 저장 없음)
│   ├── app/
│   └── tests/
├── frontend/       # React SPA (Zustand, persist 미사용)
│   └── src/
├── docs/           # Project documentation
├── config/         # Configuration files
├── .planning/      # GSD workflow files
├── .claude/        # Claude Code 설정
└── README.md
```

## 핵심 제약

- 로그인 정보와 분석 결과는 **DB·서버·localStorage에 저장하지 않는다.** 새로고침·로그아웃 시 사라진다.
- 업로드 이미지는 메모리에서만 처리하고 디스크에 저장하지 않는다.
- 접근성 점수는 자체 지표이며 공식 WCAG 인증 점수가 아니다.

---

Created: 2026-09-22
