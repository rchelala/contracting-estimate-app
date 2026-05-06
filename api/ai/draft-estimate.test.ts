import { describe, expect, it } from 'vitest'
import { getCompletionText } from './draft-estimate'

const draftJson = JSON.stringify({
  sections: [
    {
      name: 'Labor',
      line_items: [
        {
          description: 'Install base cabinets',
          quantity: 1,
          unit: 'each',
          unit_price_low_cents: 50000,
          unit_price_typical_cents: 65000,
          unit_price_high_cents: 80000,
          markup_pct: 20,
          taxable: false,
        },
      ],
    },
  ],
})

describe('getCompletionText', () => {
  it('uses a later Anthropic text block when the first content block is not text', () => {
    const response = {
      content: [
        { type: 'thinking', thinking: 'Estimate structure planning' },
        { type: 'text', text: draftJson },
      ],
    }

    expect(getCompletionText(response, 'raw provider envelope')).toBe(draftJson)
  })

  it('collects text from nested output content arrays', () => {
    const response = {
      output: [
        {
          content: [{ type: 'text', text: draftJson }],
        },
      ],
    }

    expect(getCompletionText(response, 'raw provider envelope')).toBe(draftJson)
  })

  it('falls back to the raw response when no text content is available', () => {
    expect(getCompletionText({ content: [{ type: 'thinking' }] }, 'raw body')).toBe('raw body')
  })
})
