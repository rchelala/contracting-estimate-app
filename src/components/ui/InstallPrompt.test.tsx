import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import InstallPrompt from './InstallPrompt'
import { InstallPromptContext } from '../../contexts/InstallPromptContext'
import type { ReactNode } from 'react'

// Helper to render with a mocked context value
function renderWithContext(value: Parameters<typeof InstallPromptContext.Provider>[0]['value'], ui: ReactNode) {
  return render(
    <InstallPromptContext.Provider value={value}>
      {ui}
    </InstallPromptContext.Provider>
  )
}

const base = {
  canInstall: true,
  isIOS: false,
  isStandalone: false,
  isDismissed: false,
  trigger: vi.fn().mockResolvedValue(undefined),
  dismiss: vi.fn(),
}

test('renders nothing when canInstall is false', () => {
  renderWithContext({ ...base, canInstall: false }, <InstallPrompt />)
  expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument()
})

test('renders nothing when isDismissed is true', () => {
  renderWithContext({ ...base, isDismissed: true }, <InstallPrompt />)
  expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument()
})

test('renders floating button when canInstall and not dismissed', () => {
  renderWithContext(base, <InstallPrompt />)
  expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument()
})

test('calls trigger on Android install click', () => {
  const trigger = vi.fn().mockResolvedValue(undefined)
  renderWithContext({ ...base, trigger }, <InstallPrompt />)
  fireEvent.click(screen.getByRole('button', { name: /install app/i }))
  expect(trigger).toHaveBeenCalledOnce()
})

test('opens iOS modal instead of calling trigger on iOS', () => {
  renderWithContext({ ...base, isIOS: true }, <InstallPrompt />)
  fireEvent.click(screen.getByRole('button', { name: /install app/i }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(base.trigger).not.toHaveBeenCalled()
})

test('dismiss button calls dismiss', () => {
  const dismiss = vi.fn()
  renderWithContext({ ...base, dismiss }, <InstallPrompt />)
  fireEvent.click(screen.getByRole('button', { name: /dismiss install prompt/i }))
  expect(dismiss).toHaveBeenCalledOnce()
})
