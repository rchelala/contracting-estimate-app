import { useRef } from 'react'
import { useWizardStore } from '../../stores/wizardStore'
import { WizardShell } from './WizardShell'

const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp,image/gif'
const ACCEPTED_VIDEO = 'video/mp4,video/quicktime,video/webm'

export function WizardStep3Capture() {
  const { photoFiles, videoFile, addPhotoFile, removePhotoFile, setVideoFile, setStep } = useWizardStore()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach((f) => addPhotoFile(f))
  }

  const thumbnails = photoFiles.map((f) => URL.createObjectURL(f))

  return (
    <WizardShell
      step={3}
      title="Capture the job"
      subtitle="Step 3 of 5 · Photos help AI understand the scope"
      onBack={() => setStep(2)}
      onSkip={() => setStep(4)}
    >
      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {thumbnails.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removePhotoFile(i)}
              className="absolute top-1 right-1 bg-black/40 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>
        ))}

        {videoFile && (
          <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-200 flex items-center justify-center">
            <span className="text-2xl">🎬</span>
            <button
              onClick={() => setVideoFile(null)}
              className="absolute top-1 right-1 bg-black/40 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {photoFiles.length < 10 && (
          <button
            onClick={() => photoInputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-2xl hover:border-blue-300 hover:text-blue-400"
          >
            +
          </button>
        )}
      </div>

      {/* Upload buttons */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          📷 Camera
        </button>
        <button
          onClick={() => photoInputRef.current?.click()}
          className="border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          🖼 Library
        </button>
        <button
          onClick={() => videoInputRef.current?.click()}
          disabled={!!videoFile}
          className="border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          🎬 Video
        </button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept={ACCEPTED_IMAGES}
        multiple
        className="hidden"
        onChange={(e) => handlePhotoFiles(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPTED_IMAGES}
        capture="environment"
        className="hidden"
        onChange={(e) => handlePhotoFiles(e.target.files)}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept={ACCEPTED_VIDEO}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setVideoFile(f)
        }}
      />

      <button
        onClick={() => setStep(4)}
        className="w-full bg-blue-500 text-white rounded-lg py-2.5 font-semibold text-sm"
      >
        Continue →
      </button>
    </WizardShell>
  )
}
