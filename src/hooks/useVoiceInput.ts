import { useState, useRef, useCallback, useEffect } from 'react'

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void
}

interface UseVoiceInputResult {
  isSupported: boolean
  isListening: boolean
  error: string | null
  interimText: string
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
  const [error, setError] = useState<string | null>(null)
  const [interimText, setInterimText] = useState('')
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
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const latest = event.results[event.resultIndex]
      if (latest?.[0]) {
        if (latest.isFinal) {
          setInterimText('')
          onTranscriptRef.current(latest[0].transcript)
        } else {
          setInterimText(latest[0].transcript)
        }
      }
    }
    recognition.onend = () => {
      setInterimText('')
      if (activeRef.current) {
        // Delay before restarting — Chrome/Edge throw if you call start() immediately after end.
        setTimeout(() => {
          if (activeRef.current) createAndStart()
        }, 250)
      } else {
        setIsListening(false)
      }
    }
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[useVoiceInput] onerror:', event.error)
      if (
        event.error === 'not-allowed' ||
        event.error === 'audio-capture' ||
        event.error === 'service-not-allowed'
      ) {
        activeRef.current = false
        setIsListening(false)
        setError(
          event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'Microphone access denied. Check browser settings.'
            : 'No microphone found.'
        )
      }
      // Transient errors (no-speech, network, aborted) let onend fire and restart naturally.
    }
    try {
      recognition.start()
    } catch (e) {
      console.error('[useVoiceInput] start() threw:', e)
      activeRef.current = false
      setIsListening(false)
      setError('Could not start microphone.')
      return
    }
    recognitionRef.current = recognition
  }, [SpeechRecognitionClass])

  const start = useCallback(() => {
    if (!SpeechRecognitionClass || activeRef.current) return
    setError(null)
    activeRef.current = true
    setIsListening(true)
    createAndStart()
  }, [SpeechRecognitionClass, createAndStart])

  const stop = useCallback(() => {
    activeRef.current = false
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setIsListening(false)
    // abort() doesn't fire a final onresult, so commit any in-progress interim text now
    setInterimText(current => {
      if (current) onTranscriptRef.current(current)
      return ''
    })
  }, [])

  useEffect(() => {
    return () => {
      activeRef.current = false
      recognitionRef.current?.abort()
    }
  }, [])

  return { isSupported, isListening, error, interimText, start, stop }
}
