// (한국어 요약) 번역 함수 훅(hook) — 현재 언어에 맞는 UI 문구를 반환.
// 사용 예: const t = useT(); <p>{t('login')}</p>
import { useUiStore } from '../stores/uiStore'
import { messages, type MessageKey } from './messages'

export function useT() {
  // 현재 언어를 구독하고, 키를 받으면 해당 언어의 문구를 돌려주는 함수 반환
  const lang = useUiStore((s) => s.lang)
  return (key: MessageKey) => messages[lang][key]
}
