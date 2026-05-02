import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'

// Use vi.hoisted so mock variables are available inside vi.mock factory
const { mockGetSession, mockOnAuthStateChange, mockSignOut } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignOut: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
  },
}))

import { useAuth } from './useAuth'

const fakeSession: Session = {
  user: { id: 'user-1', email: 'test@example.com' } as Session['user'],
  access_token: 'token-123',
} as Session

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: getSession resolves with no session
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    // Default: onAuthStateChange returns a subscription with a no-op unsubscribe
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    mockSignOut.mockResolvedValue({ error: null })
  })

  it('Test 1: returns { session: null, loading: true } while getSession is pending', async () => {
    let resolveSession!: (val: { data: { session: null }; error: null }) => void
    mockGetSession.mockReturnValue(
      new Promise<{ data: { session: null }; error: null }>((resolve) => {
        resolveSession = resolve
      })
    )

    const { result } = renderHook(() => useAuth())

    // Before getSession resolves: loading = true, session = null
    expect(result.current.loading).toBe(true)
    expect(result.current.session).toBeNull()

    // Clean up pending promise to avoid open handle warnings
    resolveSession({ data: { session: null }, error: null })
  })

  it('Test 2: returns { session, loading: false } after getSession resolves with a session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession }, error: null })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toEqual(fakeSession)
  })

  it('Test 3: returns { session: null, loading: false } after getSession resolves with null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
  })

  it('Test 4: onAuthStateChange updates session when fired with a new value', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    let capturedCallback!: (event: string, session: Session | null) => void
    mockOnAuthStateChange.mockImplementation(
      (cb: (event: string, session: Session | null) => void) => {
        capturedCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }
    )

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      capturedCallback('SIGNED_IN', fakeSession)
    })

    expect(result.current.session).toEqual(fakeSession)
  })

  it('Test 5: on unmount, subscription.unsubscribe() is called', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const localUnsubscribe = vi.fn()
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: localUnsubscribe } },
    })

    const { result, unmount } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    unmount()

    expect(localUnsubscribe).toHaveBeenCalledOnce()
  })

  it('Test 6: signOut calls supabase.auth.signOut()', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSignOut).toHaveBeenCalledOnce()
  })
})
