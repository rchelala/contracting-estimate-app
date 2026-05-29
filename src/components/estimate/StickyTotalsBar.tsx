import { useEditorStore } from '../../stores/editorStore'
import { formatCents, lineItemTotal } from '../../utils/money'

export default function StickyTotalsBar() {
  const estimate = useEditorStore((s) => s.estimate)
  const lineItemsById = useEditorStore((s) => s.lineItemsById)
  if (!estimate) return null

  let subtotal = 0
  let taxableSubtotal = 0
  for (const item of Object.values(lineItemsById)) {
    if (item.optional || !item.billable) continue
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
    <div className="fixed bottom-0 left-0 w-full h-14 bg-white border-t border-stone-200 flex items-center justify-end gap-3 sm:gap-6 px-3 sm:px-6 z-30">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Subtotal</span>
        <span className="text-sm font-semibold text-stone-900">{formatCents(subtotal)}</span>
      </div>
      {tax > 0 && (
        <>
          <div className="h-5 w-px bg-stone-200" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Tax</span>
            <span className="text-sm font-semibold text-stone-900">{formatCents(tax)}</span>
          </div>
        </>
      )}
      <div className="h-5 w-px bg-stone-200" />
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Total</span>
        <span className="text-xl font-extrabold text-orange-600 tracking-tight">{formatCents(total)}</span>
      </div>
    </div>
  )
}
