interface Props {
  onClick: () => void
  disabled?: boolean
}

export default function AddSectionButton({ onClick, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="text-blue-600 text-sm py-2 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
    >
      + Add section
    </button>
  )
}
