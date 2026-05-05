import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { EditorLineItem } from '../../types/editor'
import { useEditorStore } from '../../stores/editorStore'
import { useSyncQueue } from '../../stores/syncQueueStore'
import { lineItemTotal, formatCents, dollarsToCents, centsToDollars } from '../../utils/money'
import LineItemActions from './LineItemActions'
import OptionalBadge from './OptionalBadge'
import AISuggestedBadge from './AISuggestedBadge'
import DragHandle from './DragHandle'
import AttachPhotoButton from './AttachPhotoButton'
import AttachmentThumbnails from './AttachmentThumbnails'

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

  // Capture item snapshot so callbacks always have a defined reference
  const snapshot: EditorLineItem = item

  const computed = lineItemTotal(
    Number(snapshot.quantity),
    snapshot.unit_price_cents,
    Number(snapshot.markup_pct),
  )
  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50'

  function patch(field: keyof EditorLineItem, value: unknown) {
    updateLocal(lineItemId, { [field]: value } as Partial<EditorLineItem>)
    enqueue({ kind: 'lineItem.update', id: lineItemId, patch: { [field]: value } })
  }

  function toggleOptional() {
    patch('optional', !snapshot.optional)
  }

  function handleDelete() {
    removeLocal(lineItemId)
    enqueue({ kind: 'lineItem.delete', id: lineItemId })
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className={`flex items-center gap-2 px-3 py-2 group ${rowBg} hover:bg-slate-50`}>
        <DragHandle
          listeners={listeners as unknown as Record<string, unknown>}
          attributes={attributes as unknown as Record<string, unknown>}
        />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <input
            type="text"
            maxLength={500}
            disabled={readOnly}
            defaultValue={snapshot.description}
            className="w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1 disabled:cursor-not-allowed"
            onBlur={(e) => {
              if (e.target.value !== snapshot.description) patch('description', e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') (e.target as HTMLInputElement).value = snapshot.description
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
          />
          {snapshot.optional && <OptionalBadge />}
          {snapshot.source === 'ai' && <AISuggestedBadge />}
        </div>
        <input
          type="number"
          min={0}
          max={99999}
          step="0.01"
          disabled={readOnly}
          defaultValue={Number(snapshot.quantity)}
          className="w-16 shrink-0 text-right text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1 disabled:cursor-not-allowed"
          onBlur={(e) => {
            const next = clamp(parseFloat(e.target.value), 0, 99999)
            if (next !== Number(snapshot.quantity)) patch('quantity', next)
          }}
        />
        <input
          type="number"
          min={0}
          max={999999.99}
          step="0.01"
          disabled={readOnly}
          defaultValue={centsToDollars(snapshot.unit_price_cents)}
          className="w-24 shrink-0 text-right text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1 disabled:cursor-not-allowed"
          onBlur={(e) => {
            const cents = clamp(dollarsToCents(parseFloat(e.target.value || '0')), 0, 99999999)
            if (cents !== snapshot.unit_price_cents) patch('unit_price_cents', cents)
          }}
        />
        <input
          type="number"
          min={0}
          max={1000}
          step="0.01"
          disabled={readOnly}
          defaultValue={Number(snapshot.markup_pct)}
          className="w-20 shrink-0 text-right text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1 disabled:cursor-not-allowed"
          onBlur={(e) => {
            const next = clamp(parseFloat(e.target.value || '0'), 0, 1000)
            if (next !== Number(snapshot.markup_pct)) patch('markup_pct', next)
          }}
        />
        <div className="w-24 shrink-0 text-right font-semibold text-slate-900 text-sm tabular-nums">
          {formatCents(computed)}
        </div>
        <AttachPhotoButton lineItemId={lineItemId} disabled={readOnly} />
        <LineItemActions
          optional={snapshot.optional}
          onToggleOptional={toggleOptional}
          onDelete={handleDelete}
          disabled={readOnly}
        />
      </div>
      <AttachmentThumbnails lineItemId={lineItemId} readOnly={readOnly} />
    </div>
  )
}
