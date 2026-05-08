import { Plus } from '@phosphor-icons/react'

interface Props {
  onClick: () => void
  disabled?: boolean
}

export default function AddLineItemButton({ onClick, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex items-center gap-1.5 text-orange-600 text-sm pl-9 py-2 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
    >
      <Plus size={13} weight="bold" />
      Add line item
    </button>
  )
}
