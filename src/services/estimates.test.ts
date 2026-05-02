import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the supabase module
const { mockLimit, mockOrder, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockLimit = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockFrom = vi.fn()
  return { mockLimit, mockOrder, mockSelect, mockFrom }
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

import { listEstimates } from './estimates'

describe('listEstimates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Chain: from().select().order().limit()
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ order: mockOrder })
    mockOrder.mockReturnValue({ limit: mockLimit })
  })

  it('calls the correct query chain and returns data array', async () => {
    const mockRows = [
      {
        id: 'est-1',
        estimate_number: 'EST-001',
        title: 'Roof repair',
        status: 'draft',
        total_cents: 150000,
        updated_at: '2026-01-15T12:00:00Z',
        clients: { name: 'Apex Roofing' },
      },
    ]
    mockLimit.mockResolvedValue({ data: mockRows, error: null })

    const result = await listEstimates()

    expect(mockFrom).toHaveBeenCalledWith('estimates')
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining('clients ( name )')
    )
    expect(mockOrder).toHaveBeenCalledWith('updated_at', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(200)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('est-1')
  })

  it('rejects with the error when the query fails', async () => {
    const mockError = new Error('DB connection failed')
    mockLimit.mockResolvedValue({ data: null, error: mockError })

    await expect(listEstimates()).rejects.toThrow('DB connection failed')
  })

  it('maps clients object to flat client_name field, defaulting to null', async () => {
    const mockRows = [
      {
        id: 'est-1',
        estimate_number: 'EST-001',
        title: 'Job A',
        status: 'draft',
        total_cents: 50000,
        updated_at: '2026-01-15T12:00:00Z',
        clients: { name: 'Test Client' },
      },
      {
        id: 'est-2',
        estimate_number: 'EST-002',
        title: 'Job B',
        status: 'sent',
        total_cents: 75000,
        updated_at: '2026-01-14T12:00:00Z',
        clients: null,
      },
    ]
    mockLimit.mockResolvedValue({ data: mockRows, error: null })

    const result = await listEstimates()

    expect(result[0].client_name).toBe('Test Client')
    expect(result[1].client_name).toBeNull()
  })
})
