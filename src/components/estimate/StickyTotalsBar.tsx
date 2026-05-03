import { useEditorStore } from '../../stores/editorStore'
import { formatCents } from '../../utils/money'

export default function StickyTotalsBar() {
  const estimate = useEditorStore((s) => s.estimate)
  if (!estimate) return null
  const subtotal = estimate.subtotal_cents
  const tax = estimate.tax_cents
  const total = estimate.total_cents
  return (
    <div className="fixed bottom-0 left-0 w-full h-14 bg-white border-t border-slate-200 flex items-center justify-end gap-6 px-6 z-30">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Subtotal:</span>
        <span className="text-sm font-semibold text-slate-900">{formatCents(subtotal)}</span>
      </div>
      {tax > 0 && (
        <>
          <span className="text-slate-300">·</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Tax:</span>
            <span className="text-sm font-semibold text-slate-900">{formatCents(tax)}</span>
          </div>
        </>
      )}
      <span className="text-slate-300">·</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Total:</span>
        <span className="text-xl font-semibold text-slate-900">{formatCents(total)}</span>
      </div>
    </div>
  )
}
