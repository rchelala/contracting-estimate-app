import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SendEstimateModal from './SendEstimateModal'

vi.mock('../../services/estimates', () => ({
  sendEstimate: vi.fn(),
}))

vi.mock('../../stores/editorStore', () => ({
  useEditorStore: (selector: (s: unknown) => unknown) => {
    const state = {
      estimate: {
        id: 'est-123',
        estimate_number: '0012',
        title: 'Kitchen Renovation',
        total_cents: 845000,
        public_token: 'abc123',
      },
      replaceEstimateTotals: vi.fn(),
      setReadOnly: vi.fn(),
    }
    return selector(state)
  },
}))

vi.mock('../ui/Modal', () => ({
  default: ({ open, children, title, footer }: {
    open: boolean
    children: React.ReactNode
    title: string
    footer: React.ReactNode
  }) =>
    open ? (
      <div>
        <div data-testid="modal-title">{title}</div>
        {children}
        {footer}
      </div>
    ) : null,
}))

vi.mock('../../services/clients', () => ({
  getClient: vi.fn().mockResolvedValue(null),
}))

import { sendEstimate } from '../../services/estimates'
const mockedSendEstimate = vi.mocked(sendEstimate)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SendEstimateModal', () => {
  it('renders with auto-filled subject', () => {
    render(<SendEstimateModal open={true} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue('Estimate #0012 – Kitchen Renovation')).toBeInTheDocument()
  })

  it('disables Send button when To email is empty', () => {
    render(<SendEstimateModal open={true} onClose={vi.fn()} />)
    const sendBtn = screen.getByRole('button', { name: /send estimate/i })
    expect(sendBtn).toBeDisabled()
  })

  it('enables Send button once a valid email is typed', () => {
    render(<SendEstimateModal open={true} onClose={vi.fn()} />)
    const toInput = screen.getByPlaceholderText(/client@example.com/i)
    fireEvent.change(toInput, { target: { value: 'client@test.com' } })
    const sendBtn = screen.getByRole('button', { name: /send estimate/i })
    expect(sendBtn).not.toBeDisabled()
  })

  it('calls sendEstimate with correct args on submit', async () => {
    mockedSendEstimate.mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<SendEstimateModal open={true} onClose={onClose} />)

    fireEvent.change(screen.getByPlaceholderText(/client@example.com/i), {
      target: { value: 'client@test.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send estimate/i }))

    await waitFor(() => {
      expect(mockedSendEstimate).toHaveBeenCalledWith(
        'est-123',
        'client@test.com',
        'Estimate #0012 – Kitchen Renovation',
        ''
      )
    })
  })

  it('closes modal on success', async () => {
    mockedSendEstimate.mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<SendEstimateModal open={true} onClose={onClose} />)

    fireEvent.change(screen.getByPlaceholderText(/client@example.com/i), {
      target: { value: 'client@test.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send estimate/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('shows error message on failure', async () => {
    mockedSendEstimate.mockRejectedValue(new Error('Resend failed'))
    render(<SendEstimateModal open={true} onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/client@example.com/i), {
      target: { value: 'client@test.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send estimate/i }))

    await waitFor(() => {
      expect(screen.getByText('Resend failed')).toBeInTheDocument()
    })
  })
})
