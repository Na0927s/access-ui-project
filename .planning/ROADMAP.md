# Access Ui - Roadmap

## Current Milestone: v0.1.0 - Foundation

### Phase 0: Project Setup (1~2주)
- [ ] backend: venv, requirements, `uvicorn` 실행, `/api/health`
- [ ] frontend: Vite + React + TS + Tailwind + Router + Zustand
- [ ] 공통 레이아웃: Header(Kr/En, 로그인/회원가입), Footer, 위로 가기 버튼
- [ ] 메인 화면: 개발자·사용자 카드

### Phase 1: Core Analysis (3~4주)
- [ ] 업로드 검증 (형식, 10MB, 손상 파일)
- [ ] `services/cvd.py` Machado 시뮬레이션 + 테스트
- [ ] `services/palette.py` 주요 색상 추출
- [ ] `services/wcag.py` 대비율 + 기준값 테스트

### Phase 2: Diagnosis (5주)
- [ ] 색상 구분 가능성 (OKLab 거리, 임계값 실험)
- [ ] PASS/WARNING/FAIL 판정, 문제 탐지

### Phase 3: Improvement (6주)
- [ ] 대체 색상 추천 + 재검증
- [ ] 접근성 점수 (자체 지표 문구)
- [ ] 사용자 모드 결과 화면 완성

### Phase 4: AI (7주)
- [ ] `/api/ai/explain`, `/api/ai/translate` (키 없을 때 기본 문장)
- [ ] En 전환 시 결과 문장 번역

### Phase 5: Developer Mode (8주)
- [ ] 방식1 화면 이미지 / 방식2 HTML·CSS (sandbox 추출)
- [ ] 문제 해결 방법 카드 + 요약

### Phase 6: Account (9주)
- [ ] 회원가입·로그인·로그아웃 (메모리 상태)
- [ ] 마이페이지: 내 정보, 결과 내역

### Phase 7: Wrap-up (10주~)
- [ ] 통합 테스트, 접근성 점검, 발표 준비

---

*Generated: 2026-09-22*
