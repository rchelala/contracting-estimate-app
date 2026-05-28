import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ClientViewPage from './ClientViewPage'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '../lib/supabase'
const mockedFrom = vi.mocked(supabase.from)

function mockEstimateQuery(data: unknown, error: unknown = null) {
  mockedFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  } as never)
}

function renderWithToken(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/e/${token}`]}>
      <Routes>
        <Route path="/e/:token" element={<ClientViewPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => vi.clearAllMocks())

const mockEstimate = {
  id: 'est-123',
  estimate_number: '0012',
  title: 'Kitchen Renovation',
  total_cents: 845000,
  subtotal_cents: 800000,
  tax_cents: 45000,
  status: 'sent',
  sent_at: '2026-05-08T12:00:00Z',
  public_token: 'abc123',
  organizations: { name: 'Chelala Construction' },
  estimate_sections: [
    {
      id: 'sec-1',
      name: 'Demo & Prep',
      position: 10,
      estimate_line_items: [
        { id: 'li-1', description: 'Demolition labor', quantity: 1, unit_price_cents: 64000, markup_pct: 0, position: 10, billable: true },
      ],
    },
  ],
}

describe('ClientViewPage', () => {
  it('shows loading state initially', () => {
    mockedFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue(new Promise(() => {})),
        }),
      }),
    } as never)

    renderWithToken('abc123')
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders estimate title and total after loading', async () => {
    mockEstimateQuery(mockEstimate)
    renderWithToken('abc123')

    await waitFor(() => {
      expect(screen.getByText('Kitchen Renovation')).toBeInTheDocument()
      expect(screen.getByText('$8,450.00')).toBeInTheDocument()
    })
  })

  it('renders contractor org name', async () => {
    mockEstimateQuery(mockEstimate)
    renderWithToken('abc123')

    await waitFor(() => {
      expect(screen.getByText('Chelala Construction')).toBeInTheDocument()
    })
  })

  it('renders section names and line items', async () => {
    mockEstimateQuery(mockEstimate)
    renderWithToken('abc123')

    await waitFor(() => {
      expect(screen.getByText('Demo & Prep')).toBeInTheDocument()
      expect(screen.getByText('Demolition labor')).toBeInTheDocument()
    })
  })

  it('shows not found when estimate is null', async () => {
    mockEstimateQuery(null, { message: 'Not found' })
    renderWithToken('bad-token')

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument()
    })
  })
})
