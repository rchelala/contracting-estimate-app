import { describe, expect, it } from 'vitest'
import { buildWelcomeEmailHtml } from './send-welcome'

describe('buildWelcomeEmailHtml', () => {
  it('contains the you-are-all-set heading', () => {
    expect(buildWelcomeEmailHtml()).toContain("You're all set.")
  })

  it('contains the add-to-home-screen section title', () => {
    expect(buildWelcomeEmailHtml()).toContain('Save to your home screen')
  })

  it('contains each of the three iPhone steps', () => {
    const html = buildWelcomeEmailHtml()
    expect(html).toContain('Tap the Share button at the bottom of Safari')
    expect(html).toContain('Scroll down and tap "Add to Home Screen"')
    expect(html).toContain('Tap "Add" in the top right corner')
  })

  it('uses the EstimateFlow brand colour', () => {
    expect(buildWelcomeEmailHtml()).toContain('#ea580c')
  })

  it('contains a dashboard nudge', () => {
    expect(buildWelcomeEmailHtml()).toContain('Create your first estimate from the dashboard')
  })
})
