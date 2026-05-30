import { useEffect, useRef, useState, useCallback } from 'react'
import { VideoCamera, Stop, ArrowCounterClockwise, ArrowRight, Warning } from '@phosphor-icons/react'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { extractVideoFrames } from '../../utils/videoFrames'
import { useWizardStore } from '../../stores/wizardStore'

type Phase = 'idle' | 'recording' | 'review'

interface Props {
  onContinue: () => void
  onCancel: () => void
}

export function WizardVideoRecorder({ onContinue, onCancel }: Props) {
  const { addPhotoFile, setVideoTranscript } = useWizardStore()

  const [phase, setPhase] = useState<Phase>('idle')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const previewRef = useRef<HTMLVideoElement>(null)

  // Clean up review object URL when it changes or component unmounts
  useEffect(() => {
    return () => { if (reviewUrl) URL.revokeObjectURL(reviewUrl) }
  }, [reviewUrl])

  const voiceInput = useVoiceInput({
    onTranscript: useCallback((text: string) => {
      setTranscript((prev) => (prev ? `${prev} ${text}` : text))
    }, []),
  })

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true,
      })
      streamRef.current = stream
      if (previewRef.current) {
        previewRef.current.srcObject = stream
      }
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError(
          isIOS
            ? 'Camera access denied. On iPhone: Settings → Apps → Safari → Camera → Allow'
            : 'Camera access denied. Check browser permissions in Settings.',
        )
      } else {
        setCameraError('Could not access camera. Try uploading photos instead.')
      }
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [startCamera])

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const recorder = new MediaRecorder(streamRef.current)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      setRecordedBlob(blob)
      setReviewUrl(URL.createObjectURL(blob))
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setPhase('review')
    }
    recorder.start()
    recorderRef.current = recorder
    setPhase('recording')
    voiceInput.start()
  }

  function stopRecording() {
    voiceInput.stop()
    recorderRef.current?.stop()
    recorderRef.current = null
  }

  async function handleContinue() {
    if (!recordedBlob) return
    setIsExtracting(true)
    try {
      const frames = await extractVideoFrames(recordedBlob)
      frames.forEach((f) => addPhotoFile(f))
      setVideoTranscript(transcript)
    } catch {
      // Frame extraction failure is non-blocking; transcript alone is still useful
    } finally {
      setIsExtracting(false)
    }
    onContinue()
  }

  async function handleReRecord() {
    setRecordedBlob(null)
    setTranscript('')
    setPhase('idle')
    await startCamera()
  }

  if (cameraError) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <Warning size={36} className="text-orange-400" weight="fill" />
        <p className="text-sm text-stone-600 leading-relaxed max-w-xs">{cameraError}</p>
        <button
          onClick={onCancel}
          className="text-sm text-stone-500 underline"
        >
          Use photo upload instead
        </button>
      </div>
    )
  }

  if (phase === 'review' && recordedBlob) {
    return (
      <div className="flex flex-col gap-4">
        <video
          src={reviewUrl ?? undefined}
          controls
          playsInline
          className="w-full rounded-xl bg-black aspect-video"
        />
        {transcript ? (
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-xs text-stone-500 font-medium mb-1">Transcript</p>
            <p className="text-sm text-stone-700 leading-relaxed">{transcript}</p>
          </div>
        ) : (
          <p className="text-xs text-stone-400 text-center">No transcript captured</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleReRecord}
            className="flex items-center justify-center gap-1.5 border border-stone-200 rounded-lg py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            <ArrowCounterClockwise size={15} weight="bold" /> Re-record
          </button>
          <button
            onClick={handleContinue}
            disabled={isExtracting}
            className="flex items-center justify-center gap-1.5 bg-linear-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-lg py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60"
          >
            {isExtracting ? 'Processing…' : (
              <><ArrowRight size={15} weight="bold" /> Continue</>
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <video
          ref={previewRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {phase === 'recording' && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            REC
          </div>
        )}
      </div>

      {phase === 'recording' && (
        <div className="min-h-12 bg-stone-50 rounded-xl px-3 py-2">
          {transcript || voiceInput.interimText ? (
            <p className="text-sm text-stone-600 leading-relaxed">
              {transcript}
              {voiceInput.interimText && (
                <span className="text-stone-400"> {voiceInput.interimText}</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-stone-400 italic">Speak to describe the job…</p>
          )}
        </div>
      )}

      {phase === 'recording' && !voiceInput.isSupported && (
        <p className="text-xs text-stone-400 text-center">
          Live transcript unavailable — your video will still be analyzed.
        </p>
      )}

      <div className="flex gap-2">
        {phase === 'idle' && (
          <>
            <button
              onClick={onCancel}
              className="flex-1 border border-stone-200 rounded-lg py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              onClick={startRecording}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2.5 text-sm font-semibold shadow-sm"
            >
              <VideoCamera size={16} weight="fill" /> Record
            </button>
          </>
        )}
        {phase === 'recording' && (
          <button
            onClick={stopRecording}
            className="w-full flex items-center justify-center gap-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-lg py-2.5 text-sm font-semibold shadow-sm"
          >
            <Stop size={16} weight="fill" /> Stop recording
          </button>
        )}
      </div>
    </div>
  )
}
