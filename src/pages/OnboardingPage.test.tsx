import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OnboardingPage from './OnboardingPage'

const mockNavigate = vi.fn()

vi.mock('../services/organizations', () => ({
  createOrganization: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ session: { access_token: 'test-token-abc' } }),
}))

vi.mock('../components/ui/LogoBadge', () => ({
  default: () => null,
}))

beforeEach(() => {
  mockNavigate.mockClear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

function renderPage() {
  return render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>,
  )
}

describe('OnboardingPage', () => {
  it('calls the welcome email endpoint after successful org creation', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: 'Apex Roofing Co.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true }))

    expect(fetch).toHaveBeenCalledWith('/api/email/send-welcome', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token-abc' },
    })
  })

  it('navigates to dashboard even if the welcome email fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    renderPage()
    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: 'Apex Roofing Co.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true }))
    expect(fetch).toHaveBeenCalledWith('/api/email/send-welcome', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token-abc' },
    })
  })
})
