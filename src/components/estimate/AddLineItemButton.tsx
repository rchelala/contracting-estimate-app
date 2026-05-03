interface Props {
  onClick: () => void
  disabled?: boolean
}

export default function AddLineItemButton({ onClick, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="text-blue-600 text-sm pl-9 py-2 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
    >
      + Add line item
    </button>
  )
}
