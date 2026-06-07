import { useRef, useMemo, useEffect, useState } from 'react'
import { Camera, Images, FilmSlate, X, Plus, VideoCamera } from '@phosphor-icons/react'
import { useWizardStore } from '../../stores/wizardStore'
import { WizardShell } from './WizardShell'
import { WizardVideoRecorder } from './WizardVideoRecorder'

const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp,image/gif'
const ACCEPTED_VIDEO = 'video/mp4,video/quicktime,video/webm'

export function WizardStep3Capture() {
  const { photoFiles, videoFile, addPhotoFile, removePhotoFile, setVideoFile, setStep } = useWizardStore()
  const [showRecorder, setShowRecorder] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach((f) => addPhotoFile(f))
  }

  const thumbnails = useMemo(
    () => photoFiles.map((f) => URL.createObjectURL(f)),
    [photoFiles]
  )

  useEffect(() => {
    return () => {
      thumbnails.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [thumbnails])

  if (showRecorder) {
    return (
      <WizardShell
        step={3}
        title="Record a walkthrough"
        subtitle="Step 3 of 6 · Narrate what needs to be done"
        onBack={() => setShowRecorder(false)}
      >
        <WizardVideoRecorder
          onContinue={() => setStep(5)}
          onCancel={() => setShowRecorder(false)}
        />
      </WizardShell>
    )
  }

  return (
    <WizardShell
      step={3}
      title="Capture the job"
      subtitle="Step 3 of 6 · Photos help AI understand the scope"
      onBack={() => setStep(2)}
      onSkip={() => setStep(4)}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        {thumbnails.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-stone-100">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removePhotoFile(i)}
              className="absolute top-1 right-1 bg-black/40 text-white rounded-full w-5 h-5 flex items-center justify-center"
            >
              <X size={10} weight="bold" />
            </button>
          </div>
        ))}

        {videoFile && (
          <div className="relative aspect-square rounded-xl overflow-hidden bg-stone-200 flex items-center justify-center">
            <FilmSlate size={28} weight="fill" className="text-stone-500" />
            <button
              onClick={() => setVideoFile(null)}
              className="absolute top-1 right-1 bg-black/40 text-white rounded-full w-5 h-5 flex items-center justify-center"
            >
              <X size={10} weight="bold" />
            </button>
          </div>
        )}

        {photoFiles.length < 10 && (
          <button
            onClick={() => photoInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-400 hover:border-orange-300 hover:text-orange-400"
          >
            <Plus size={24} weight="bold" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 border border-stone-200 rounded-lg py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
        >
          <Camera size={15} weight="fill" /> Camera
        </button>
        <button
          onClick={() => photoInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 border border-stone-200 rounded-lg py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
        >
          <Images size={15} weight="fill" /> Library
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          onClick={() => videoInputRef.current?.click()}
          disabled={!!videoFile}
          className="flex items-center justify-center gap-1.5 border border-stone-200 rounded-lg py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40"
        >
          <FilmSlate size={15} weight="fill" /> Upload video
        </button>
        <button
          onClick={() => setShowRecorder(true)}
          className="flex items-center justify-center gap-1.5 border border-orange-200 bg-orange-50 rounded-lg py-2 text-sm font-medium text-orange-600 hover:bg-orange-100"
        >
          <VideoCamera size={15} weight="fill" /> Record walkthrough
        </button>
      </div>

      <input ref={photoInputRef} type="file" accept={ACCEPTED_IMAGES} multiple className="hidden" onChange={(e) => handlePhotoFiles(e.target.files)} />
      <input ref={cameraInputRef} type="file" accept={ACCEPTED_IMAGES} capture="environment" className="hidden" onChange={(e) => handlePhotoFiles(e.target.files)} />
      <input ref={videoInputRef} type="file" accept={ACCEPTED_VIDEO} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideoFile(f) }} />

      <button
        onClick={() => setStep(4)}
        className="w-full bg-linear-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-lg py-2.5 font-semibold text-sm shadow-sm"
      >
        Continue
      </button>
    </WizardShell>
  )
}
