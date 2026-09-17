export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const oneDay = 86400000
  if (diff < oneDay) return '今天'
  if (diff < 2 * oneDay) return '昨天'
  if (diff < 7 * oneDay) return `${Math.floor(diff / oneDay)} 天前`
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Lightweight markdown-ish to HTML renderer. */
export function renderMarkdown(text: string): string {
  // Use a minimal set of rules; proper markdown is handled by `marked` in components.
  return text
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const DISCLAIMER =
  '⚠️ 本产品为健康辅助工具，所有内容仅供参考，不构成医疗诊断。如身体不适请及时就医，紧急情况请拨打 120。'

export { DISCLAIMER }
