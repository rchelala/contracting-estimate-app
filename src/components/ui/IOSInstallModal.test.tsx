import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import IOSInstallModal from './IOSInstallModal'

describe('IOSInstallModal', () => {
  it('renders nothing when closed', () => {
    render(<IOSInstallModal open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders 4 steps when open', () => {
    render(<IOSInstallModal open={true} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Tap "\.\.\."/)).toBeInTheDocument()
    expect(screen.getByText(/Tap "Share"/)).toBeInTheDocument()
    expect(screen.getByText(/Scroll down and tap "Add to Home Screen"/)).toBeInTheDocument()
    expect(screen.getByText(/Tap "Add"/)).toBeInTheDocument()
  })

  it('calls onClose when Got it is clicked', () => {
    const onClose = vi.fn()
    render(<IOSInstallModal open={true} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /got it/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
