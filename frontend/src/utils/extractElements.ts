import type { ElementInput } from '../api/types'

const MAX_INPUT = 500 * 1024
const MAX_ELEMENTS = 500
const DANGEROUS = 'script, iframe, object, embed, link, meta, base, form'

/** Remove scripts, event handlers and external resources. The HTML is never executed. */
export function sanitize(html: string, css: string): string {
  if (html.length + css.length > MAX_INPUT) throw new Error('코드가 너무 깁니다. 500KB 이하로 입력해주세요.')
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll(DANGEROUS).forEach((n) => n.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim().toLowerCase()
      if (name.startsWith('on')) el.removeAttribute(attr.name)
      if (['src', 'href', 'srcset', 'action', 'xlink:href'].includes(name)) el.removeAttribute(attr.name)
      if (value.startsWith('javascript:')) el.removeAttribute(attr.name)
    }
  })
  const safeCss = css.replace(/@import[^;]+;/gi, '').replace(/url\([^)]*\)/gi, 'none')
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">`
  return `<!doctype html><html><head>${csp}<style>${safeCss}</style></head><body>${doc.body.innerHTML}</body></html>`
}

function toHex(color: string): string | null {
  const m = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)/)
  if (!m) return null
  const alpha = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
  if (alpha === 0) return null
  return '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function effectiveBackground(el: Element, win: Window): string {
  let node: Element | null = el
  while (node) {
    const hex = toHex(win.getComputedStyle(node).backgroundColor)
    if (hex) return hex
    node = node.parentElement
  }
  return '#FFFFFF'
}

function selectorOf(el: Element): string {
  if (el.id) return `#${el.id}`
  const cls = Array.from(el.classList).slice(0, 2)
  if (cls.length) return `${el.tagName.toLowerCase()}.${cls.join('.')}`
  const parent = el.parentElement
  if (!parent) return el.tagName.toLowerCase()
  const index = Array.from(parent.children).indexOf(el) + 1
  return `${selectorOf(parent)} > ${el.tagName.toLowerCase()}:nth-child(${index})`
}

/** Render sanitized HTML in a sandboxed iframe (scripts disabled) and read computed colors. */
export function extractElements(html: string, css: string): Promise<ElementInput[]> {
  const srcdoc = sanitize(html, css)
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('sandbox', 'allow-same-origin') // no allow-scripts
    iframe.style.cssText = 'position:absolute;left:-10000px;width:1280px;height:800px;'
    iframe.srcdoc = srcdoc
    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument!
        const win = iframe.contentWindow!
        const out: ElementInput[] = []
        for (const el of Array.from(doc.body.querySelectorAll('*'))) {
          const ownText = Array.from(el.childNodes)
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => n.textContent?.trim() ?? '')
            .join(' ')
            .trim()
          if (!ownText) continue
          const style = win.getComputedStyle(el)
          const color = toHex(style.color)
          if (!color) continue
          out.push({
            selector: selectorOf(el),
            text: ownText.slice(0, 80),
            color,
            background: effectiveBackground(el, win),
            font_size_px: parseFloat(style.fontSize) || null,
            font_weight: parseInt(style.fontWeight, 10) || null,
          })
          if (out.length >= MAX_ELEMENTS) break
        }
        resolve(out)
      } catch (e) {
        reject(e)
      } finally {
        iframe.remove()
      }
    }
    document.body.appendChild(iframe)
  })
}
