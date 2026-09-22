import type { CvdType, DeveloperAnalysis, ElementInput, ImageAnalysis } from './types'

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    // Server returned HTML (proxy error, timeout page, etc.)
    throw new Error('서버에 연결하지 못했습니다. 백엔드가 실행 중인지 확인해주세요.')
  }
  if (!res.ok) {
    const msg = (body as { message?: string })?.message
    throw new Error(msg ?? '요청을 처리하지 못했습니다.')
  }
  return body as T
}

export async function analyzeImage(
  file: File,
  cvdType: CvdType,
  mode: 'user' | 'developer',
): Promise<ImageAnalysis> {
  const form = new FormData()
  form.append('file', file)
  form.append('cvd_type', cvdType)
  form.append('mode', mode)
  return handle(await fetch('/api/analysis/image', { method: 'POST', body: form }))
}

export async function analyzeElements(elements: ElementInput[], cvdType: CvdType): Promise<DeveloperAnalysis> {
  return handle(await fetch('/api/developer/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cvd_type: cvdType, elements }),
  }))
}

export interface Explanation {
  source: 'ai' | 'fallback'
  summary: string
  issues: { id: number; explanation: string }[]
}

export async function explain(analysis: object, lang: 'ko' | 'en', mode: 'user' | 'developer') {
  return handle<Explanation>(
    await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, mode, analysis }),
    }),
  )
}

export async function translate(texts: string[], targetLang: 'ko' | 'en') {
  return handle<{ source: 'ai' | 'fallback'; texts: string[] }>(
    await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_lang: targetLang, texts }),
    }),
  )
}
