# ColorLens

## Vision

"내가 보는 화면이 모든 사용자에게 똑같이 보일까?"

웹 UI가 색각이상 사용자에게 어떻게 보이는지 시뮬레이션하고 접근성 문제를 진단·개선하는 웹 서비스.
사용자 모드: 화면 캡처 이미지(PNG/JPG, 10MB 이하)를 업로드하고 적·녹·청 색약 유형을 선택하면 원본과 시뮬레이션 결과를 나란히 보여주고 결과 내용을 요약한다.
개발자 모드: 화면 이미지 또는 HTML/CSS 코드를 분석해 요소별 상세 결과와 문제 해결 방법 카드, 요약을 제공한다.
분석: 주요 색상 추출, 색상 구분 가능성, WCAG 대비율 검사, PASS/WARNING/FAIL 판정, 접근성 점수, 대체 색상 추천과 재검증.
처리 흐름: 프론트엔드가 이미지와 선택한 색약 유형을 백엔드로 보내면, 백엔드(Python FastAPI)가 Pillow로 시뮬레이션과 색상 분석을 처리해 결과 이미지와 분석 결과를 돌려준다. 백엔드는 AI 설명·번역 API 호출도 담당한다. 업로드 이미지는 분석 후 서버에 저장하지 않는다.
공통: 로그인·회원가입, 마이페이지(내 정보, 결과 내역), Kr/En 전환.
저장 정책은 로그인 여부에 따라 다르다. 비로그인 사용자의 분석 결과는 메모리에서만 처리하고 저장하지 않는다(새로고침 시 소멸). 로그인 사용자의 분석 결과는 SQLite DB에 영속화해 히스토리·캐시·통계로 활용한다. 백엔드에 회원가입·로그인·사용자 API를 구현하고, 비밀번호는 bcrypt로 해시해 저장한다. 인가는 서버 메모리 세션 토큰(in-memory opaque token) 기반이며, 인증 토큰·세션은 브라우저 저장소(localStorage/sessionStorage/쿠키)에 쓰지 않고 메모리에서만 다룬다. 업로드 이미지 바이트는 로그인 여부와 무관하게 DB·디스크에 저장하지 않고 메모리(BytesIO)에서만 처리한다(캐시 키로 이미지 SHA-256 해시만 저장).

## Tech Stack Summary

- **Backend**: Python 3.12 / FastAPI / Pillow / NumPy / httpx
- **Frontend**: React + TypeScript / TailwindCSS / Zustand
- **Database**: SQLite (WAL) / SQLAlchemy 2.0 ORM / bcrypt
- **Infrastructure**: 없음

## Context

- 팀: 3인(프론트엔드 / 접근성 분석 / 백엔드), 개발 기간 2~3개월, 학교 팀 프로젝트
- 대상: 웹·UI 디자이너, 학생, 포트폴리오 제작자(사용자 모드) / 프론트엔드 개발자, 퍼블리셔(개발자 모드)

## Requirements

### Active (MVP) — 구현 완료

- [x] 메인 화면 (개발자·사용자 카드, 헤더, 푸터, 위로 가기)
- [x] 이미지 업로드 (드래그 앤 드롭, PNG/JPG, 10MB)
- [x] 색각이상 시뮬레이션 (적·녹·청, Machado 2009)
- [x] 주요 색상 추출 / 색상 구분 가능성 (OKLab ΔE, 14개 UI 색쌍 검증 완료)
- [x] WCAG 대비율 검사 및 PASS/WARNING/FAIL 판정
- [x] 접근성 점수 (자체 지표 안내 문구 포함)
- [x] 문제 색상 탐지 / 대체 색상 추천 + 재검증
- [x] 사용자 모드 결과 화면 (원본 / 결과 / 결과 내용)

### Active (가능하면 구현) — 구현 완료

- [x] 로그인·회원가입·마이페이지 (백엔드 DB 영속화, in-memory 세션 토큰)
- [x] 결과 내역 (로그인 사용자는 DB 영속화, 비로그인은 메모리만)
- [x] 개발자 모드 방식1·방식2 + 문제 해결 방법 카드·요약
- [x] AI 설명 / Kr·En 전환(En은 AI 번역)
- [ ] 개선 전·후 비교

### Deferred

- URL 분석 (Headless Browser)
- 코드 이미지(OCR) 분석
- 리포트 다운로드

### Out of Scope

- 배포 인프라 구성 (추후 별도 결정)
- 사용자 모드의 "문제 해결 방법/요약" 영역 (개발자 모드 전용)
- 영속 세션·JWT·세션 쿠키 (in-memory 세션 토큰만 허용)

## Key Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| Backend Language | Java/Spring Boot, Python | Python 3.12 + FastAPI | Pillow로 이미지 처리, 짧은 코드, 자동 API 문서 |
| 이미지 처리 위치 | 브라우저 Canvas, 서버 Pillow | 서버 Pillow | 분석 로직을 Python 한 곳에 모음 (손그림 설계 반영) |
| Database | MySQL, SQLite, 없음 | SQLite (WAL) + SQLAlchemy 2.0 | 로그인 사용자 결과 영속화(히스토리·캐시·통계), 서버 재시작에도 유지 |
| Auth | 영속 세션, JWT, in-memory 토큰 | in-memory 세션 토큰 (opaque) | 비로그인 결과는 비저장, 토큰은 서버 메모리만(재시작 시 소멸), 브라우저 저장소 미사용 |
| 시뮬레이션 | Brettel, Viénot, Machado | Machado(2009) | 선형 RGB 3×3 행렬, 구현 단순 |
| 색상 거리 | CIELAB ΔE2000, OKLab | OKLab | 구현 단순, 지각 균일성 양호 |
| WCAG 기준 | AA, AAA | AA 기본 (AAA 참고 표시) | 일반적 준수 기준 |
| 앱 유형 | SPA, SSR, Static | SPA | 페이지 이동 시 메모리 상태 유지 |

## Milestones

### Milestone 1: Foundation (1~2주) — 완료
- [x] backend/frontend 실행 환경
- [x] 화면 골격과 라우팅

### Milestone 2: Core Analysis (3~6주) — 완료
- [x] 업로드 → 시뮬레이션 → 색상·대비 분석 → 추천 → 결과 화면

### Milestone 3: Extended (7~9주) — 완료
- [x] AI 설명·번역, 개발자 모드, 로그인·결과 내역

### Milestone 4: Polish (10주~) — 진행 중
- [x] 단위 테스트 97건 (전체 통과)
- [x] 색상 거리 OKLab 전환 + 임계값 14개 셋 검증
- [ ] 점수/전체 판정 재설계 (팀 결정 대기)
- [ ] 버그 수정, UI 개선, 발표 준비

---

*Last updated: 2026-11-09*
