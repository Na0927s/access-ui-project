// (한국어 요약) 개발자 모드의 "HTML/CSS 코드 분석" 유틸리티.
// 1) sanitize(): 입력된 코드에서 스크립트·이벤트·외부 리소스를 제거 (규칙 9번 — 코드 비실행)
// 2) extractElements(): 안전해진 HTML을 sandbox iframe에 렌더링하고,
//    브라우저의 계산된 스타일(getComputedStyle)로 각 요소의 글자색/배경색/폰트 정보를 추출
import type { ElementInput } from '../api/types'

const MAX_INPUT = 500 * 1024     // 입력 크기 상한 (500KB) — 과도한 입력 방지
const MAX_ELEMENTS = 500         // 추출할 요소 수 상한 (백엔드 스키마와 동일)
const DANGEROUS = 'script, iframe, object, embed, link, meta, base, form' // 통째로 제거할 태그

/** Remove scripts, event handlers and external resources. The HTML is never executed.
 *  (한국어) HTML/CSS 정화(sanitize) — 스크립트·이벤트 속성·외부 리소스를 모두 제거한
 *  안전한 완전한 HTML 문서 문자열을 반환 */
export function sanitize(html: string, css: string): string {
  if (html.length + css.length > MAX_INPUT) throw new Error('코드가 너무 깁니다. 500KB 이하로 입력해주세요.')
  const doc = new DOMParser().parseFromString(html, 'text/html')
  // 위험 태그(script 등)는 요소 자체를 삭제
  doc.querySelectorAll(DANGEROUS).forEach((n) => n.remove())
  // 모든 요소의 속성을 검사해 위험 속성 제거
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim().toLowerCase()
      if (name.startsWith('on')) el.removeAttribute(attr.name)   // onclick 등 이벤트 핸들러 제거
      if (['src', 'href', 'srcset', 'action', 'xlink:href'].includes(name)) el.removeAttribute(attr.name) // 외부 리소스 참조 제거
      if (value.startsWith('javascript:')) el.removeAttribute(attr.name) // javascript: URL 제거
    }
  })
  // CSS도 @import(외부 불러오기)와 url(...) 참조를 제거
  const safeCss = css.replace(/@import[^;]+;/gi, '').replace(/url\([^)]*\)/gi, 'none')
  // Content-Security-Policy를 심은 완전한 문서로 재조립 — 최종 안전장치 (무엇도 로드/실행 불가)
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">`
  return `<!doctype html><html><head>${csp}<style>${safeCss}</style></head><body>${doc.body.innerHTML}</body></html>`
}

// "rgb(255, 0, 0)" / "rgba(...)" 문자열을 "#FF0000" HEX으로 변환 (불가능하면 null)
function toHex(color: string): string | null {
  const m = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)/)
  if (!m) return null
  // alpha 값 정규화 (% 표기면 100으로 나누고, 투명(0)이면 배경색으로 간주해 null)
  const alpha = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
  if (alpha === 0) return null
  return '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase()
}

// 요소의 "실제 보이는 배경색" 찾기: 자신이 투명하면 부모를 따라 올라가며 불투명 색을 찾음
function effectiveBackground(el: Element, win: Window): string {
  let node: Element | null = el
  while (node) {
    const hex = toHex(win.getComputedStyle(node).backgroundColor)
    if (hex) return hex
    node = node.parentElement
  }
  return '#FFFFFF' // 끝까지 투명하면 흰 배경으로 가정
}

// 요소를 사람이 알아볼 수 있는 CSS 선택자로 표현 (#id > tag.class1.class2 > ...)
function selectorOf(el: Element): string {
  if (el.id) return `#${el.id}`                                  // 1순위: id
  const cls = Array.from(el.classList).slice(0, 2)               // 2순위: 태그 + 클래스 최대 2개
  if (cls.length) return `${el.tagName.toLowerCase()}.${cls.join('.')}`
  const parent = el.parentElement
  if (!parent) return el.tagName.toLowerCase()
  // 클래스도 없으면 부모 선택자 + 몇 번째 자식인지로 표현
  const index = Array.from(parent.children).indexOf(el) + 1
  return `${selectorOf(parent)} > ${el.tagName.toLowerCase()}:nth-child(${index})`
}

/** Render sanitized HTML in a sandboxed iframe (scripts disabled) and read computed colors.
 *  (한국어) 정화된 HTML을 화면 밖의 sandbox iframe에 렌더링한 뒤,
 *  텍스트를 가진 요소들의 색상 정보를 추출해 백엔드로 보낼 목록을 반환 (Promise) */
export function extractElements(html: string, css: string): Promise<ElementInput[]> {
  const srcdoc = sanitize(html, css) // 먼저 정화
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('sandbox', 'allow-same-origin') // no allow-scripts — 스크립트 실행 절대 불가
    // 화면 밖(-10000px)에 배치해 사용자에게 보이지 않게 렌더링
    iframe.style.cssText = 'position:absolute;left:-10000px;width:1280px;height:800px;'
    iframe.srcdoc = srcdoc
    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument!
        const win = iframe.contentWindow!
        const out: ElementInput[] = []
        for (const el of Array.from(doc.body.querySelectorAll('*'))) {
          // 요소가 "직접" 가진 텍스트만 추출 (자식 요소의 텍스트는 자식이 처리하도록 중복 방지)
          const ownText = Array.from(el.childNodes)
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => n.textContent?.trim() ?? '')
            .join(' ')
            .trim()
          if (!ownText) continue // 텍스트 없는 요소는 분석 대상 아님 (div 컨테이너 등)
          const style = win.getComputedStyle(el)
          const color = toHex(style.color)
          if (!color) continue
          out.push({
            selector: selectorOf(el),
            text: ownText.slice(0, 80),            // 텍스트는 최대 80자만 전송
            color,
            background: effectiveBackground(el, win),
            font_size_px: parseFloat(style.fontSize) || null,   // 큰 텍스트 판정용
            font_weight: parseInt(style.fontWeight, 10) || null,
          })
          if (out.length >= MAX_ELEMENTS) break
        }
        resolve(out)
      } catch (e) {
        reject(e)
      } finally {
        iframe.remove() // 분석이 끝나면 iframe을 DOM에서 제거해 자원 정리
      }
    }
    document.body.appendChild(iframe)
  })
}
