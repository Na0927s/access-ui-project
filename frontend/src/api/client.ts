// (한국어 요약) 백엔드 API 호출 함수 모음 (fetch 래퍼).
// 모든 요청은 vite proxy를 통해 /api 경로로 전달됨. 공통 에러 처리도 여기서 담당.
import type { CvdType, DeveloperAnalysis, ElementInput, ImageAnalysis, Lang } from './types'

// 공통 응답 처리: JSON 파싱 + 에러 변환
async function handle<T>(res: Response): Promise<T> {
  const text = await res.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    // Server returned HTML (proxy error, timeout page, etc.)
    // (한국어) 서버가 JSON이 아닌 HTML을 반환한 경우 = 백엔드가 꺼져 있거나 프록시 오류
    throw new Error('서버에 연결하지 못했습니다. 백엔드가 실행 중인지 확인해주세요.')
  }
  if (!res.ok) {
    // 백엔드가 보낸 {"code", "message"} 형식의 에러 메시지를 그대로 사용
    const msg = (body as { message?: string })?.message
    throw new Error(msg ?? '요청을 처리하지 못했습니다.')
  }
  return body as T
}

// 이미지 분석 요청: FormData로 파일 + 옵션을 전송 (POST /api/analysis/image)
export async function analyzeImage(
  file: File,
  cvdType: CvdType,
  mode: 'user' | 'developer',
  lang: Lang,
): Promise<ImageAnalysis> {
  const form = new FormData()
  form.append('file', file)
  form.append('cvd_type', cvdType)
  form.append('mode', mode)
  form.append('lang', lang)
  return handle(await fetch('/api/analysis/image', { method: 'POST', body: form }))
}

// 코드 분석 요청: 추출된 요소 목록을 JSON으로 전송 (POST /api/developer/analyze)
export async function analyzeElements(
  elements: ElementInput[],
  cvdType: CvdType,
  lang: Lang,
): Promise<DeveloperAnalysis> {
  return handle(await fetch('/api/developer/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cvd_type: cvdType, elements, lang }),
  }))
}

// AI 설명 응답의 형태: source가 'fallback'이면 AI 없이 템플릿 문구로 응답된 것
export interface Explanation {
  source: 'ai' | 'fallback'
  summary: string
  issues: { id: number; explanation: string }[]
}

// AI 설명 요청: 분석 결과를 보내 사람이 읽는 요약 문구를 받음 (POST /api/ai/explain)
export async function explain(analysis: object, lang: Lang, mode: 'user' | 'developer') {
  return handle<Explanation>(
    await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, mode, analysis }),
    }),
  )
}
