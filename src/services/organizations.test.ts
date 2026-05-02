import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoist mock variables so they're available inside vi.mock() factory
const { mockRpc, mockFrom, mockSelect, mockEq, mockLimit, mockMaybeSingle } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockLimit: vi.fn(),
  mockMaybeSingle: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}))

// Wire up chainable query builder stubs
mockFrom.mockReturnValue({ select: mockSelect })
mockSelect.mockReturnValue({ eq: mockEq })
mockEq.mockReturnValue({ limit: mockLimit })
mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle })

import { createOrganization, getMyMembership } from './organizations'

describe('createOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-wire chainable stubs after clearAllMocks
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ limit: mockLimit })
    mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle })
  })

  it('throws "Company name is required." for whitespace-only input and does NOT call supabase.rpc', async () => {
    await expect(createOrganization('  ')).rejects.toThrow('Company name is required.')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('throws length error for name > 120 chars and does NOT call supabase.rpc', async () => {
    const longName = 'A'.repeat(121)
    await expect(createOrganization(longName)).rejects.toThrow(
      'Company name must be 120 characters or fewer.'
    )
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('calls supabase.rpc with trimmed name and returns the org id on success', async () => {
    const fakeOrgId = 'abc-123-uuid'
    mockRpc.mockResolvedValue({ data: fakeOrgId, error: null })

    const result = await createOrganization('Apex Roofing Co.')
    expect(mockRpc).toHaveBeenCalledWith('create_organization', { p_name: 'Apex Roofing Co.' })
    expect(result).toBe(fakeOrgId)
  })

  it('rejects with sanitized error message when RPC returns an error', async () => {
    const dbError = new Error('SQL detail: duplicate key value violates unique constraint')
    mockRpc.mockResolvedValue({ data: null, error: dbError })

    await expect(createOrganization('Test Co.')).rejects.toThrow(
      "Couldn't create your workspace. Please try again."
    )
    // Verify the original error is preserved as cause
    await expect(createOrganization('Test Co.')).rejects.toMatchObject({
      cause: dbError,
    })
  })
})

describe('getMyMembership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ limit: mockLimit })
    mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle })
  })

  it('queries organization_members by user_id and returns the membership row or null', async () => {
    const fakeMembership = {
      id: 'mem-id',
      organization_id: 'org-id',
      role: 'owner',
    }
    mockMaybeSingle.mockResolvedValue({ data: fakeMembership, error: null })

    const result = await getMyMembership('user-id-123')
    expect(mockFrom).toHaveBeenCalledWith('organization_members')
    expect(mockSelect).toHaveBeenCalledWith('id, organization_id, role')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-id-123')
    expect(result).toEqual(fakeMembership)
  })
})
