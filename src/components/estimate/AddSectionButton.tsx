import { Plus } from '@phosphor-icons/react'

interface Props {
  onClick: () => void
  disabled?: boolean
}

export default function AddSectionButton({ onClick, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex items-center gap-1.5 bg-linear-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
    >
      <Plus size={14} weight="bold" />
      Add section
    </button>
  )
}
