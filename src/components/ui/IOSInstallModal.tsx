import Modal from './Modal'

interface Props {
  open: boolean
  onClose: () => void
}

const STEPS = [
  'Tap "..." at the bottom of Safari to open the menu',
  'Tap "Share" ⬆️',
  'Scroll down and tap "Add to Home Screen"',
  'Tap "Add" in the top right corner',
]

export default function IOSInstallModal({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add to Home Screen"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
        >
          Got it
        </button>
      }
    >
      <p className="text-xs text-slate-500 mb-4">Follow these steps in Safari</p>
      <ol className="flex flex-col gap-3 list-none p-0 m-0">
        {STEPS.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-slate-700">{step}</span>
          </li>
        ))}
      </ol>
    </Modal>
  )
}
