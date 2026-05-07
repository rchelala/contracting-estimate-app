import { useState, useRef, useCallback, useEffect } from 'react'

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void
}

interface UseVoiceInputResult {
  isSupported: boolean
  isListening: boolean
  start: () => void
  stop: () => void
}

type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: Event) => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

export function useVoiceInput({ onTranscript }: UseVoiceInputOptions): UseVoiceInputResult {
  const SpeechRecognitionClass =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : undefined

  const isSupported = !!SpeechRecognitionClass
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const start = useCallback(() => {
    if (!SpeechRecognitionClass || isListening) return
    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const latest = event.results[event.resultIndex]
      if (latest) {
        onTranscript(latest[0].transcript)
      }
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }, [SpeechRecognitionClass, isListening, onTranscript])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  return { isSupported, isListening, start, stop }
}
