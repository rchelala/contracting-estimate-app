import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore, computeSubtotalCents } from './editorStore'
import type { FullEstimate } from '../types/editor'

function makeFull(): FullEstimate {
  const estId = 'est-1',
    orgId = 'org-1'
  return {
    estimate: {
      id: estId,
      organization_id: orgId,
      estimate_number: 'EST-0001',
      status: 'draft',
      title: null,
      notes: null,
      client_id: null,
      subtotal_cents: 0,
      tax_cents: 0,
      total_cents: 0,
      public_token: 't',
      tax_rate_pct: null,
      tax_zip: null,
      issued_at: null,
      expires_at: null,
      sent_at: null,
      first_sent_at: null,
      approved_at: null,
      approved_by_name: null,
      approved_client_ip: null,
      approved_user_agent: null,
      created_at: '',
      updated_at: '',
    },
    sections: [
      {
        id: 's2',
        organization_id: orgId,
        estimate_id: estId,
        name: 'B',
        position: 20,
        created_at: '',
        updated_at: '',
      },
      {
        id: 's1',
        organization_id: orgId,
        estimate_id: estId,
        name: 'A',
        position: 10,
        created_at: '',
        updated_at: '',
      },
    ],
    lineItems: [
      {
        id: 'li1',
        organization_id: orgId,
        estimate_id: estId,
        section_id: 's1',
        description: 'X',
        quantity: 2,
        unit_price_cents: 1000,
        markup_pct: 50,
        optional: false,
        taxable: true,
        source: 'contractor',
        ai_price_low_cents: null,
        ai_price_typical_cents: null,
        ai_price_high_cents: null,
        unit: null,
        position: 10,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'li2',
        organization_id: orgId,
        estimate_id: estId,
        section_id: 's1',
        description: 'Y',
        quantity: 1,
        unit_price_cents: 5000,
        markup_pct: 0,
        optional: true,
        taxable: true,
        source: 'contractor',
        ai_price_low_cents: null,
        ai_price_typical_cents: null,
        ai_price_high_cents: null,
        unit: null,
        position: 20,
        created_at: '',
        updated_at: '',
      },
    ],
    attachments: [],
  }
}

beforeEach(() => useEditorStore.getState().reset())

describe('editorStore', () => {
  it('hydrates and orders sections by position', () => {
    useEditorStore.getState().hydrate(makeFull())
    expect(useEditorStore.getState().sectionOrder).toEqual(['s1', 's2'])
  })

  it('computes subtotal excluding optional items', () => {
    useEditorStore.getState().hydrate(makeFull())
    // 2 * 1000 * 1.50 = 3000 cents (li2 is optional and excluded)
    expect(computeSubtotalCents(useEditorStore.getState())).toBe(3000)
  })

  it('removeSectionLocal also removes its line items', () => {
    useEditorStore.getState().hydrate(makeFull())
    useEditorStore.getState().removeSectionLocal('s1')
    expect(useEditorStore.getState().lineItemsById['li1']).toBeUndefined()
    expect(useEditorStore.getState().sectionOrder).toEqual(['s2'])
  })

  it('sets readOnly when status !== draft', () => {
    const full = makeFull()
    full.estimate.status = 'sent'
    useEditorStore.getState().hydrate(full)
    expect(useEditorStore.getState().readOnly).toBe(true)
  })
})
