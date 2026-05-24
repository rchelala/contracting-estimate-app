import { render, screen, act, fireEvent } from '@testing-library/react'
import { InstallPromptProvider, useInstallPrompt } from './InstallPromptContext'

// jsdom doesn't implement matchMedia — stub it
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('standalone') ? false : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  })
  localStorage.clear()
})

function TestConsumer() {
  const { canInstall, isIOS, isStandalone, isDismissed, dismiss } = useInstallPrompt()
  return (
    <div>
      <span data-testid="canInstall">{String(canInstall)}</span>
      <span data-testid="isIOS">{String(isIOS)}</span>
      <span data-testid="isStandalone">{String(isStandalone)}</span>
      <span data-testid="isDismissed">{String(isDismissed)}</span>
      <button onClick={dismiss}>dismiss</button>
    </div>
  )
}

test('canInstall is false with no prompt and non-iOS', () => {
  render(<InstallPromptProvider><TestConsumer /></InstallPromptProvider>)
  expect(screen.getByTestId('canInstall').textContent).toBe('false')
})

test('canInstall becomes true when beforeinstallprompt fires', () => {
  render(<InstallPromptProvider><TestConsumer /></InstallPromptProvider>)
  act(() => {
    const event = new Event('beforeinstallprompt')
    ;(event as any).prompt = vi.fn().mockResolvedValue(undefined)
    window.dispatchEvent(event)
  })
  expect(screen.getByTestId('canInstall').textContent).toBe('true')
})

test('dismiss sets isDismissed and writes localStorage', () => {
  render(<InstallPromptProvider><TestConsumer /></InstallPromptProvider>)
  fireEvent.click(screen.getByText('dismiss'))
  expect(screen.getByTestId('isDismissed').textContent).toBe('true')
  expect(localStorage.getItem('pwa-install-dismissed')).toBe('true')
})

test('isDismissed reads from localStorage on mount', () => {
  localStorage.setItem('pwa-install-dismissed', 'true')
  render(<InstallPromptProvider><TestConsumer /></InstallPromptProvider>)
  expect(screen.getByTestId('isDismissed').textContent).toBe('true')
})

test('isStandalone is false in jsdom', () => {
  render(<InstallPromptProvider><TestConsumer /></InstallPromptProvider>)
  expect(screen.getByTestId('isStandalone').textContent).toBe('false')
})
