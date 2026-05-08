import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the supabase module
const { mockDelete, mockEq, mockLimit, mockOrder, mockSelect, mockFrom, mockGetSession } = vi.hoisted(() => {
  const mockDelete = vi.fn()
  const mockEq = vi.fn()
  const mockLimit = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockFrom = vi.fn()
  const mockGetSession = vi.fn()
  return { mockDelete, mockEq, mockLimit, mockOrder, mockSelect, mockFrom, mockGetSession }
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getSession: mockGetSession,
    },
  },
}))

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { deleteEstimate, listEstimates, sendEstimate } from './estimates'

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
    expect(result.at(0)?.id).toBe('est-1')
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

    expect(result.at(0)?.client_name).toBe('Test Client')
    expect(result.at(1)?.client_name).toBeNull()
  })
})

describe('deleteEstimate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ delete: mockDelete })
    mockDelete.mockReturnValue({ eq: mockEq })
  })

  it('deletes the selected estimate by id', async () => {
    mockEq.mockResolvedValue({ error: null })

    await deleteEstimate('est-1')

    expect(mockFrom).toHaveBeenCalledWith('estimates')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 'est-1')
  })

  it('rejects with the error when delete fails', async () => {
    const mockError = new Error('Delete failed')
    mockEq.mockResolvedValue({ error: mockError })

    await expect(deleteEstimate('est-1')).rejects.toThrow('Delete failed')
  })
})

describe('sendEstimate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POSTs to /api/email/send-estimate with correct payload', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    } as never)
    mockFetch.mockResolvedValue({ ok: true })

    await sendEstimate('est-123', 'client@example.com', 'Estimate #0012', 'Hi!')

    expect(mockFetch).toHaveBeenCalledWith('/api/email/send-estimate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        estimate_id: 'est-123',
        to: 'client@example.com',
        subject: 'Estimate #0012',
        message: 'Hi!',
      }),
    })
  })

  it('throws when response is not ok', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    } as never)
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Resend failed' }),
    })

    await expect(
      sendEstimate('est-123', 'client@example.com', 'Subject', '')
    ).rejects.toThrow('Resend failed')
  })

  it('throws fallback message when error field is absent in non-ok response', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    } as never)
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),  // no error field
    })

    await expect(
      sendEstimate('est-123', 'client@example.com', 'Subject', '')
    ).rejects.toThrow('Failed to send estimate')
  })

  it('throws Not authenticated when no session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    } as never)

    await expect(
      sendEstimate('est-123', 'client@example.com', 'Subject', '')
    ).rejects.toThrow('Not authenticated')
  })
})
