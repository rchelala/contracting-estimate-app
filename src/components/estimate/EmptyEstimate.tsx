interface Props {
  onAddSection: () => void
}

export default function EmptyEstimate({ onAddSection }: Props) {
  return (
    <div className="text-center py-16">
      <h2 className="text-base font-semibold text-slate-900 mb-2">Add your first section</h2>
      <p className="text-sm text-slate-500 mb-6">
        Organize your estimate into sections — for example, Labor or Materials.
      </p>
      <button
        type="button"
        className="text-blue-600 text-sm hover:text-blue-700"
        onClick={onAddSection}
      >
        + Add section
      </button>
    </div>
  )
}
