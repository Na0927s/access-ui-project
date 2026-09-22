import { useEffect, useState } from 'react'
import { translate } from '../api/client'
import { useUiStore } from '../stores/uiStore'
import { messages, type MessageKey } from './messages'

export function useT() {
  const lang = useUiStore((s) => s.lang)
  return (key: MessageKey) => messages[lang][key]
}

// In-memory cache only (no storage). Cleared on refresh.
const cache = new Map<string, string>()

/** Translates dynamic Korean sentences when English is selected; falls back to the original. */
export function useTranslated(texts: string[]): string[] {
  const lang = useUiStore((s) => s.lang)
  const [out, setOut] = useState(texts)
  const key = texts.join('\u0000')

  useEffect(() => {
    if (lang === 'ko' || texts.length === 0) {
      setOut(texts)
      return
    }
    const missing = texts.filter((t) => !cache.has(t))
    if (missing.length === 0) {
      setOut(texts.map((t) => cache.get(t) ?? t))
      return
    }
    let alive = true
    translate(missing, 'en')
      .then((r) => {
        missing.forEach((t, i) => cache.set(t, r.texts[i] ?? t))
        if (alive) setOut(texts.map((t) => cache.get(t) ?? t))
      })
      .catch(() => alive && setOut(texts))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, key])

  return out
}
