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
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionErrorEvent = Event & { error: string }

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
  // Tracks whether the user intends to be recording — separate from browser session state.
  // Chrome can fire onend/onerror before setIsListening(true) is processed, which would
  // leave isListening stuck at true (guard blocks re-start). Using a ref avoids that race.
  const activeRef = useRef(false)
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  const createAndStart = useCallback(() => {
    if (!SpeechRecognitionClass) return
    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const latest = event.results[event.resultIndex]
      if (latest?.[0]) {
        onTranscriptRef.current(latest[0].transcript)
      }
    }
    recognition.onend = () => {
      if (activeRef.current) {
        // Chrome ends sessions on silence or network timeout even with continuous=true.
        // Delay before restarting — Chrome throws if you call start() immediately after end.
        setTimeout(() => {
          if (activeRef.current) createAndStart()
        }, 250)
      } else {
        setIsListening(false)
      }
    }
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'audio-capture') {
        // Permanent errors — stop intending to listen so onend doesn't restart.
        activeRef.current = false
        setIsListening(false)
      }
      // Transient errors (no-speech, network) let onend fire and restart naturally.
    }
    try {
      recognition.start()
    } catch {
      activeRef.current = false
      setIsListening(false)
      return
    }
    recognitionRef.current = recognition
  }, [SpeechRecognitionClass])

  const start = useCallback(() => {
    if (!SpeechRecognitionClass || activeRef.current) return
    activeRef.current = true
    setIsListening(true)
    createAndStart()
  }, [SpeechRecognitionClass, createAndStart])

  const stop = useCallback(() => {
    activeRef.current = false
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  useEffect(() => {
    return () => {
      activeRef.current = false
      recognitionRef.current?.abort()
    }
  }, [])

  return { isSupported, isListening, start, stop }
}
