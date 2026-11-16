// (한국어 요약) WAI-ARIA Tabs 패턴을 위한 roving tabindex + 화살표 키 훅.
// tablist 안의 각 tab 버튼에 부여할 props를 반환한다.
// - 활성 tab은 tabindex=0, 나머지는 tabindex=-1 (roving tabindex)
// - 좌/우 화살표 키로 탭 전환, Home/End로 첫/마지막 탭 이동
// - 전환 시 다음 tab으로 포커스 이동
// tab id / panel id는 호출부에서 useId로 생성해 aria-controls·aria-labelledby에 직접 연결한다.
import { useCallback, useRef, type KeyboardEvent } from 'react'

export function useRovingTabs<T extends string>(
  tabs: readonly T[],
  activeTab: T,
  onSelect: (tab: T) => void,
) {
  // 각 tab 버튼 요소를 tab 값으로 참조. 포커스 이동에 사용.
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const focusTab = useCallback((tab: T) => {
    refs.current[tab]?.focus()
  }, [])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, currentTab: T) => {
      const idx = tabs.indexOf(currentTab)
      let nextIdx: number | null = null
      if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length
      else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length
      else if (e.key === 'Home') nextIdx = 0
      else if (e.key === 'End') nextIdx = tabs.length - 1
      if (nextIdx === null) return
      e.preventDefault()
      const nextTab = tabs[nextIdx]
      onSelect(nextTab)
      focusTab(nextTab)
    },
    [tabs, onSelect, focusTab],
  )

  // tab 버튼에 spread할 props 생성. tabId는 aria-controls와 연결용.
  const getTabButtonProps = useCallback(
    (tab: T, tabId: string, panelId: string) => ({
      role: 'tab' as const,
      id: tabId,
      'aria-selected': activeTab === tab,
      'aria-controls': panelId,
      tabIndex: activeTab === tab ? 0 : -1,
      onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => onKeyDown(e, tab),
      ref: (el: HTMLButtonElement | null) => {
        refs.current[tab] = el
      },
    }),
    [activeTab, onKeyDown],
  )

  return { getTabButtonProps }
}
