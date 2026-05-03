import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEditorStore } from '../../stores/editorStore'
import { useSyncQueue } from '../../stores/syncQueueStore'
import { lineItemTotal, formatCents, dollarsToCents, centsToDollars } from '../../utils/money'
import LineItemActions from './LineItemActions'
import OptionalBadge from './OptionalBadge'
import DragHandle from './DragHandle'

interface Props {
  lineItemId: string
  index: number
  readOnly: boolean
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

export default function LineItemRow({ lineItemId, index, readOnly }: Props) {
  const item = useEditorStore((s) => s.lineItemsById[lineItemId])
  const updateLocal = useEditorStore((s) => s.updateLineItemLocal)
  const removeLocal = useEditorStore((s) => s.removeLineItemLocal)
  const enqueue = useSyncQueue((s) => s.enqueue)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lineItemId,
    disabled: readOnly,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (!item) return null

  const computed = lineItemTotal(Number(item.quantity), item.unit_price_cents, Number(item.markup_pct))
  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50'

  function patch(field: keyof typeof item, value: unknown) {
    updateLocal(lineItemId, { [field]: value } as Partial<typeof item>)
    enqueue({ kind: 'lineItem.update', id: lineItemId, patch: { [field]: value } })
  }

  function toggleOptional() {
    patch('optional', !item.optional)
  }

  function handleDelete() {
    removeLocal(lineItemId)
    enqueue({ kind: 'lineItem.delete', id: lineItemId })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 group ${rowBg} hover:bg-slate-50`}
    >
      <DragHandle
        listeners={listeners as Record<string, unknown>}
        attributes={attributes as Record<string, unknown>}
      />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <input
          type="text"
          maxLength={500}
          disabled={readOnly}
          defaultValue={item.description}
          className="w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1 disabled:cursor-not-allowed"
          onBlur={(e) => {
            if (e.target.value !== item.description) patch('description', e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLInputElement).value = item.description
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
        />
        {item.optional && <OptionalBadge />}
      </div>
      <input
        type="number"
        min={0}
        max={99999}
        step="0.01"
        disabled={readOnly}
        defaultValue={Number(item.quantity)}
        className="w-16 shrink-0 text-right text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1 disabled:cursor-not-allowed"
        onBlur={(e) => {
          const next = clamp(parseFloat(e.target.value), 0, 99999)
          if (next !== Number(item.quantity)) patch('quantity', next)
        }}
      />
      <input
        type="number"
        min={0}
        max={999999.99}
        step="0.01"
        disabled={readOnly}
        defaultValue={centsToDollars(item.unit_price_cents)}
        className="w-24 shrink-0 text-right text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1 disabled:cursor-not-allowed"
        onBlur={(e) => {
          const cents = clamp(dollarsToCents(parseFloat(e.target.value || '0')), 0, 99999999)
          if (cents !== item.unit_price_cents) patch('unit_price_cents', cents)
        }}
      />
      <input
        type="number"
        min={0}
        max={1000}
        step="0.01"
        disabled={readOnly}
        defaultValue={Number(item.markup_pct)}
        className="w-20 shrink-0 text-right text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1 disabled:cursor-not-allowed"
        onBlur={(e) => {
          const next = clamp(parseFloat(e.target.value || '0'), 0, 1000)
          if (next !== Number(item.markup_pct)) patch('markup_pct', next)
        }}
      />
      <div className="w-24 shrink-0 text-right font-semibold text-slate-900 text-sm tabular-nums">
        {formatCents(computed)}
      </div>
      <LineItemActions
        optional={item.optional}
        onToggleOptional={toggleOptional}
        onDelete={handleDelete}
        disabled={readOnly}
      />
    </div>
  )
}
