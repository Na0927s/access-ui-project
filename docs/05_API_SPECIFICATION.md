# API SPECIFICATION

**Project**: ColorLens
**Type**: web (Single Page Application)
**Date**: 2026-09-22

---

## Overview

- Base URL: `http://localhost:8002`
- 자동 문서: `/docs` (Swagger UI)
- 회원·로그인 API는 `/api/auth/*`에 구현되어 있다 (백엔드 SQLite + in-memory 세션 토큰). 보호 엔드포인트는 `Authorization: Bearer <token>` 헤더로 인가.
- 공통 오류 형식: `{ "code": "STRING", "message": "사용자용 메시지" }`
- `cvd_type`: `protan`(적색 계열) | `deutan`(녹색 계열) | `tritan`(청색 계열)

## 엔드포인트 목록

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/health` | 서버 상태, AI 사용 가능 여부 |
| POST | `/api/analysis/image` | 이미지 분석 (사용자 모드, 개발자 방식1) |
| POST | `/api/developer/analyze` | HTML/CSS 요소 색상 분석 (개발자 방식2) |
| POST | `/api/ai/explain` | 분석 결과 AI 설명 |
| POST | `/api/ai/translate` | 결과 문장 번역 (Kr/En) |
| POST | `/api/auth/signup` | 회원가입 (bcrypt 해시) |
| POST | `/api/auth/check-id` | ID 중복 확인 |
| POST | `/api/auth/login` | 로그인 → 세션 토큰 발급 |
| POST | `/api/auth/logout` | 로그아웃 (토큰 폐기) |
| GET | `/api/auth/me` | 내 정보 조회 (토큰 필요) |
| PUT | `/api/auth/me` | 내 정보 수정 (토큰 필요) |
| PUT | `/api/auth/me/password` | 비밀번호 변경 (토큰 필요) |
| GET | `/api/auth/history` | 분석 결과 히스토리 (토큰 필요) |
| DELETE | `/api/auth/history/{result_id}` | 히스토리 항목 삭제 (토큰 필요) |
| DELETE | `/api/auth/me` | 회원 탈퇴 (토큰 필요) |

## GET /api/health

```json
{ "status": "ok", "ai_enabled": false }
```

## POST /api/analysis/image

`multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| file | file | ○ | PNG/JPG/JPEG, 10MB 이하 |
| cvd_type | string | ○ | protan / deutan / tritan |
| detail | bool | ✕ | true면 개발자용 상세 필드 포함 (기본 false) |

응답 200
```json
{
  "cvd_type": "deutan",
  "width": 1280, "height": 720,
  "simulated_image": "data:image/png;base64,....",
  "palette": [ { "hex": "#FFFFFF", "ratio": 0.42 }, { "hex": "#EF4444", "ratio": 0.08 } ],
  "contrast_pairs": [
    { "fg": "#EF4444", "bg": "#FFFFFF", "ratio": 3.76,
      "normal_text": "FAIL", "large_text": "PASS", "ui_component": "PASS", "verdict": "WARNING" }
  ],
  "confusable_pairs": [
    { "a": "#EF4444", "b": "#22C55E",
      "distance_original": 0.31, "distance_simulated": 0.05, "verdict": "FAIL" }
  ],
  "issues": [
    { "id": 1, "type": "COLOR_CONFUSION", "severity": "HIGH",
      "colors": ["#EF4444", "#22C55E"], "message": "녹색 계열 색각이상 환경에서 두 색의 구분이 어렵습니다." }
  ],
  "recommendations": [
    { "current": "#EF4444", "against": "#FFFFFF",
      "candidates": [ { "hex": "#B91C1C", "ratio": 6.47, "grade": "RECOMMENDED", "reason": "..." } ],
      "non_color_tips": ["아이콘 추가", "텍스트 라벨 추가"] }
  ],
  "verdict": "WARNING"
}
```
> 예시의 수치는 형식 설명용이며 실제 값은 계산 결과를 따른다.
> 접근성 점수·점수 고지 문구는 폐지되어 응답에 포함되지 않는다 (판정과 설명만 제공).

오류

| HTTP | code | message |
|---|---|---|
| 400 | UNSUPPORTED_FORMAT | 지원하지 않는 파일 형식입니다. PNG, JPG, JPEG 파일만 업로드할 수 있습니다. |
| 413 | FILE_TOO_LARGE | 파일 크기가 너무 큽니다. 10MB 이하의 이미지를 업로드해주세요. |
| 400 | INVALID_IMAGE | 이미지를 불러오지 못했습니다. 다른 파일로 다시 시도해주세요. |
| 422 | INVALID_CVD_TYPE | 색각이상 유형을 선택해주세요. |
| 500 | ANALYSIS_FAILED | 분석 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요. |

## POST /api/developer/analyze

```json
{
  "cvd_type": "protan",
  "elements": [
    { "selector": ".button-danger", "text": "삭제",
      "color": "#FFFFFF", "background": "#FF0000",
      "font_size_px": 16, "font_weight": 400 }
  ]
}
```
- `elements` 최대 500개

응답 200
```json
{
  "results": [
    { "selector": ".button-danger", "color": "#FFFFFF", "background": "#FF0000",
      "ratio": 4.0, "is_large_text": false,
      "normal_text": "FAIL", "large_text": "PASS", "verdict": "FAIL",
      "distance_simulated": 0.62 }
  ],
  "solution_boxes": [
    { "selector": ".button-danger", "check_type": "CONTRAST",
      "problem": "텍스트 대비율 4.00:1로 일반 텍스트 기준(4.5:1)에 미달합니다.",
      "css_fix": ".button-danger { background-color: #E80000; }",
      "non_color_fix": "오류·위험 동작이라면 아이콘을 함께 표시하세요." }
  ],
  "summary": { "total": 1, "pass": 0, "warning": 0, "fail": 1 },
  "verdict": "FAIL"
}
```

## POST /api/ai/explain

```json
{ "lang": "ko", "mode": "user", "analysis": { "...": "analysis/image 또는 developer/analyze 응답" } }
```
응답
```json
{ "source": "ai", "summary": "...", "issues": [ { "id": 1, "explanation": "..." } ] }
```
- `source`: `ai` | `fallback` (키 없음·실패 시 기본 문장)
- AI 응답의 숫자는 무시하고 입력 분석값만 표시한다.

## POST /api/ai/translate

```json
{ "target_lang": "en", "texts": ["녹색 계열 색각이상 환경에서 두 색의 구분이 어렵습니다."] }
```
응답
```json
{ "source": "ai", "texts": ["..."] }
```
- 최대 50문장. 실패 시 `source: "fallback"`과 원문 반환

## 인증 엔드포인트 (`/api/auth/*`)

### POST /api/auth/signup
```json
{ "name": "홍길동", "email": "user@example.com", "login_id": "gildong", "password": "********" }
```
응답 200: `{ "id": 1, "name": "홍길동", "email": "user@example.com", "login_id": "gildong" }`
- 비밀번호는 bcrypt 해시(rounds=12)로만 저장.
- 중복 login_id → 409 `DUPLICATE_LOGIN_ID`, 중복 email → 409 `DUPLICATE_EMAIL`.

### POST /api/auth/login
```json
{ "login_id": "gildong", "password": "********" }
```
응답 200: `{ "user": { ... }, "token": "<opaque-token>" }`
- 토큰은 서버 메모리에만 저장(in-memory 세션). 클라이언트는 메모리에만 보관.
- 자격증명 불일치 → 401 `INVALID_CREDENTIALS`.

### 보호 엔드포인트 (공통)
- 모두 `Authorization: Bearer <token>` 헤더 필요. 토큰에서 `user_id`를 추출(경로로 받지 않음).
- 토큰 없음/만료 → 401 `UNAUTHORIZED`.

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/auth/check-id` | `{ "login_id": "..." }` → `{ "available": true/false }` |
| POST | `/api/auth/logout` | 세션 토큰 폐기 |
| GET | `/api/auth/me` | 내 정보 조회 |
| PUT | `/api/auth/me` | `{ "name": ..., "email": ... }` 이름·이메일 수정 (login_id 변경 불가) |
| PUT | `/api/auth/me/password` | `{ "current_password": ..., "new_password": ... }` 비밀번호 변경 |
| GET | `/api/auth/history` | 본인 분석 결과 히스토리 (최신순, 최대 50건) |
| DELETE | `/api/auth/history/{result_id}` | 히스토리 항목 삭제 (본인 소유만) |
| DELETE | `/api/auth/me` | 회원 탈퇴 (결과 cascade 삭제 + 세션 폐기) |

## CORS

- 개발: `http://localhost:5176` 허용
- 운영 도메인은 환경 변수 `ALLOWED_ORIGINS`로 지정


---

## Tech Stack Context

- **Backend**: Python 3.12 / FastAPI / Pillow / NumPy / httpx
- **Frontend**: React + TypeScript / TailwindCSS / Zustand
- **Database**: SQLite (WAL) / SQLAlchemy 2.0 ORM / bcrypt
- **Infrastructure**: 없음

---

*Generated by 01-template Project Generator · 내용 수정 2026-11-10*
