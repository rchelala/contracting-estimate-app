/**
 * Format a date as relative ("2 days ago") for <30 days, otherwise absolute ("Jan 15, 2026").
 * Returns '—' for invalid input rather than throwing.
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays >= 0 && diffDays < 30) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    return rtf.format(-diffDays, 'day')
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
