import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoiceInput } from './useVoiceInput'

describe('useVoiceInput', () => {
  it('returns isSupported=false when SpeechRecognition is not in window', () => {
    const { result } = renderHook(() => useVoiceInput({ onTranscript: vi.fn() }))
    expect(result.current.isSupported).toBe(false)
  })

  it('isListening starts false', () => {
    const { result } = renderHook(() => useVoiceInput({ onTranscript: vi.fn() }))
    expect(result.current.isListening).toBe(false)
  })
})
