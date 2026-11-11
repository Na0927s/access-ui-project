# ColorLens - Roadmap

## Current Milestone: v0.1.0 - Foundation

### Phase 0: Project Setup (1~2주)
- [x] backend: venv, requirements, `uvicorn` 실행, `/api/health`
- [x] frontend: Vite + React + TS + Tailwind + Router + Zustand
- [x] 공통 레이아웃: Header(Kr/En, 로그인/회원가입), Footer, 위로 가기 버튼
- [x] 메인 화면: 개발자·사용자 카드

### Phase 1: Core Analysis (3~4주)
- [x] 업로드 검증 (형식, 10MB, 손상 파일)
- [x] `services/cvd.py` Machado 시뮬레이션 + 테스트
- [x] `services/palette.py` 주요 색상 추출
- [x] `services/wcag.py` 대비율 + 기준값 테스트

### Phase 2: Diagnosis (5주)
- [x] 색상 구분 가능성 (OKLab 거리, 임계값 실험)
- [x] PASS/WARNING/FAIL 판정, 문제 탐지

### Phase 3: Improvement (6주)
- [x] 대체 색상 추천 + 재검증
- [x] 사용자 모드 결과 화면 완성 (일반인 친화적 설명)

### Phase 4: AI (7주)
- [x] `/api/ai/explain`, `/api/ai/translate` (키 없을 때 기본 문장)
- [x] En 전환 시 결과 문장 번역

### Phase 5: Developer Mode (8주)
- [x] 방식1 화면 이미지 / 방식2 HTML·CSS (sandbox 추출)
- [x] 문제 해결 방법 카드 + 요약

### Phase 6: Account (9주)
- [x] 회원가입·로그인·로그아웃 (백엔드 SQLite + in-memory 세션 토큰, bcrypt)
- [x] 마이페이지: 내 정보, 결과 내역 (로그인 사용자 DB 영속화)

### Phase 7: Wrap-up (10주~)
- [ ] 통합 테스트, 접근성 점검, 발표 준비

---

*Generated: 2026-09-22 · Updated: 2026-11-10*
