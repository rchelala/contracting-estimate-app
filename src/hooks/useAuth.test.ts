import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { useAuth } from './useAuth'

// Mock the supabase module
vi.mock('../lib/supabase', () => {
  const unsubscribeMock = vi.fn()
  const onAuthStateChangeMock = vi.fn(() => ({
    data: { subscription: { unsubscribe: unsubscribeMock } },
  }))
  const getSessionMock = vi.fn(() =>
    Promise.resolve({ data: { session: null }, error: null })
  )
  const signOutMock = vi.fn(() => Promise.resolve({ error: null }))

  return {
    supabase: {
      auth: {
        getSession: getSessionMock,
        onAuthStateChange: onAuthStateChangeMock,
        signOut: signOutMock,
      },
    },
  }
})

// Helper to get mocks after module mock is set up
async function getMocks() {
  const { supabase } = await import('../lib/supabase')
  return {
    getSession: supabase.auth.getSession as Mock,
    onAuthStateChange: supabase.auth.onAuthStateChange as Mock,
    signOut: supabase.auth.signOut as Mock,
    // Get the unsubscribe mock from within the subscription
    getUnsubscribe: () => {
      const result = (supabase.auth.onAuthStateChange as Mock).mock.results[0]
      return result?.value?.data?.subscription?.unsubscribe as Mock
    },
  }
}

const fakeSession = {
  user: { id: 'user-1', email: 'test@example.com' },
  access_token: 'token-123',
} as unknown as import('@supabase/supabase-js').Session

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset getSession to return null by default
    vi.doMock('../lib/supabase', () => {
      const unsubscribeMock = vi.fn()
      return {
        supabase: {
          auth: {
            getSession: vi.fn(() =>
              Promise.resolve({ data: { session: null }, error: null })
            ),
            onAuthStateChange: vi.fn(() => ({
              data: { subscription: { unsubscribe: unsubscribeMock } },
            })),
            signOut: vi.fn(() => Promise.resolve({ error: null })),
          },
        },
      }
    })
  })

  it('Test 1: returns { session: null, loading: true } while getSession is pending', async () => {
    const mocks = await getMocks()
    // Make getSession never resolve during this test
    let resolveSession!: (val: { data: { session: null }; error: null }) => void
    mocks.getSession.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve
      })
    )

    const { result } = renderHook(() => useAuth())

    // Should be loading immediately
    expect(result.current.loading).toBe(true)
    expect(result.current.session).toBeNull()

    // Clean up
    resolveSession({ data: { session: null }, error: null })
  })

  it('Test 2: returns { session, loading: false } after getSession resolves with a session', async () => {
    const mocks = await getMocks()
    mocks.getSession.mockResolvedValue({ data: { session: fakeSession }, error: null })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toEqual(fakeSession)
  })

  it('Test 3: returns { session: null, loading: false } after getSession resolves with null', async () => {
    const mocks = await getMocks()
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
  })

  it('Test 4: onAuthStateChange updates session when fired with a new value', async () => {
    const mocks = await getMocks()
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })

    let capturedCallback!: (event: string, session: typeof fakeSession | null) => void
    mocks.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: typeof fakeSession | null) => void) => {
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
    const mocks = await getMocks()
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })

    const unsubscribeMock = vi.fn()
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: unsubscribeMock } },
    })

    const { unmount } = renderHook(() => useAuth())
    await waitFor(() => {
      // ensure the hook mounted and subscribed
      expect(mocks.onAuthStateChange).toHaveBeenCalled()
    })

    unmount()

    expect(unsubscribeMock).toHaveBeenCalledOnce()
  })

  it('Test 6: signOut calls supabase.auth.signOut()', async () => {
    const mocks = await getMocks()
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signOut()
    })

    expect(mocks.signOut).toHaveBeenCalledOnce()
  })
})
