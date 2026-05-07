import { useEditorStore } from '../../stores/editorStore'
import { formatCents, lineItemTotal } from '../../utils/money'

export default function StickyTotalsBar() {
  const estimate = useEditorStore((s) => s.estimate)
  const lineItemsById = useEditorStore((s) => s.lineItemsById)
  if (!estimate) return null

  let subtotal = 0
  let taxableSubtotal = 0
  for (const item of Object.values(lineItemsById)) {
    if (item.optional) continue
    const itemTotal = lineItemTotal(
      Number(item.quantity),
      item.unit_price_cents,
      Number(item.markup_pct),
    )
    subtotal += itemTotal
    if (item.taxable) taxableSubtotal += itemTotal
  }

  const taxRate = Number(estimate.tax_rate_pct ?? 0)
  const tax = Math.round(taxableSubtotal * (taxRate / 100))
  const total = subtotal + tax

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
