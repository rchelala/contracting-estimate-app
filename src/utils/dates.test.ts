import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatRelativeDate } from './dates'

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Fix "now" to 2026-01-15T12:00:00Z
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "today" for today\'s date', () => {
    const result = formatRelativeDate('2026-01-15T08:00:00Z')
    expect(result).toBe('today')
  })

  it('returns "2 days ago" for a date 2 days ago', () => {
    const twoDaysAgo = new Date('2026-01-13T12:00:00Z').toISOString()
    const result = formatRelativeDate(twoDaysAgo)
    expect(result).toContain('2')
    expect(result).toContain('day')
  })

  it('returns absolute date format for a date 31 days ago', () => {
    // 31 days before 2026-01-15 = 2025-12-15
    const result = formatRelativeDate('2025-12-15T12:00:00Z')
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)
  })

  it('returns em dash for an invalid date string without throwing', () => {
    expect(() => formatRelativeDate('not-a-date')).not.toThrow()
    expect(formatRelativeDate('not-a-date')).toBe('—')
  })
})
