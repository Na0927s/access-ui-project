import { useUiStore } from '../stores/uiStore'
import { messages, type MessageKey } from './messages'

export function useT() {
  const lang = useUiStore((s) => s.lang)
  return (key: MessageKey) => messages[lang][key]
}
