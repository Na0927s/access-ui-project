// (한국어 요약) 번역 함수 훅(hook) — 현재 언어에 맞는 UI 문구를 반환.
// 사용 예: const t = useT(); <p>{t('login')}</p>
// 치환 예: t('signupDoneMsg', { name: '홍길동' }) → "홍길님, 가입이 완료되어..."
import { useUiStore } from '../stores/uiStore'
import { messages, type MessageKey } from './messages'

// {key} 형태의 placeholder를 params 값으로 치환한다. params가 없으면 원문 그대로.
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))
}

export function useT() {
  // 현재 언어를 구독하고, 키를 받으면 해당 언어의 문구를 돌려주는 함수 반환.
  // 두 번째 인자로 치환값을 넘기면 {key} placeholder를 치환한다.
  const lang = useUiStore((s) => s.lang)
  return (key: MessageKey, params?: Record<string, string | number>) =>
    interpolate(messages[lang][key], params)
}
