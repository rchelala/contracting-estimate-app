import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CaretDown } from '@phosphor-icons/react'
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

  // Start expanded for new (empty) items so the user can fill them in immediately
  const [isExpanded, setIsExpanded] = useState<boolean>(() => !item?.description)

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
      {/* ── Mobile card (< 640px) ── */}
      <div className="block sm:hidden">
        {/* Collapsed header row — always visible */}
        <div
          className="flex items-center gap-3 px-4 py-3 bg-white border-b border-stone-200 min-h-[44px] cursor-pointer"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <DragHandle
            listeners={listeners as unknown as Record<string, unknown>}
            attributes={attributes as unknown as Record<string, unknown>}
          />
          <div className="flex-1 min-w-0 font-medium text-stone-900 truncate text-sm">
            {snapshot.description || 'New item'}
          </div>
          <div className="text-sm font-semibold text-stone-900 shrink-0 tabular-nums">
            {formatCents(computed)}
          </div>
          <CaretDown
            size={16}
            weight="bold"
            aria-hidden="true"
            className={`shrink-0 text-stone-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>

        {/* Expanded detail panel */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-2 bg-stone-50 border-b border-stone-200 space-y-3">
            {/* Description */}
            <div>
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                Description
              </label>
              <textarea
                maxLength={500}
                disabled={readOnly}
                defaultValue={snapshot.description}
                rows={2}
                aria-label="Line item description"
                className="block w-full min-h-10 resize-y text-sm leading-5 bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 mt-1 disabled:cursor-not-allowed"
                onBlur={(e) => {
                  if (e.target.value !== snapshot.description) patch('description', e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') (e.target as HTMLTextAreaElement).value = snapshot.description
                }}
              />
            </div>

            {/* Qty + Unit Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Qty
                </label>
                <input
                  type="number"
                  min={0}
                  max={99999}
                  step="0.01"
                  disabled={readOnly}
                  defaultValue={Number(snapshot.quantity)}
                  aria-label="Quantity"
                  className="block w-full text-sm bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 mt-1 disabled:cursor-not-allowed"
                  onBlur={(e) => {
                    const next = clamp(parseFloat(e.target.value), 0, 99999)
                    if (next !== Number(snapshot.quantity)) patch('quantity', next)
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Unit Price
                </label>
                <input
                  type="number"
                  min={0}
                  max={999999.99}
                  step="0.01"
                  disabled={readOnly}
                  defaultValue={centsToDollars(snapshot.unit_price_cents)}
                  aria-label="Unit price"
                  className="block w-full text-sm bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 mt-1 disabled:cursor-not-allowed"
                  onBlur={(e) => {
                    const cents = clamp(dollarsToCents(parseFloat(e.target.value || '0')), 0, 99999999)
                    if (cents !== snapshot.unit_price_cents) patch('unit_price_cents', cents)
                  }}
                />
              </div>
            </div>

            {/* Markup + Total */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Markup %
                </label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  step="0.01"
                  disabled={readOnly}
                  defaultValue={Number(snapshot.markup_pct)}
                  aria-label="Markup percent"
                  className="block w-full text-sm bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 mt-1 disabled:cursor-not-allowed"
                  onBlur={(e) => {
                    const next = clamp(parseFloat(e.target.value || '0'), 0, 1000)
                    if (next !== Number(snapshot.markup_pct)) patch('markup_pct', next)
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Total
                </label>
                <div className="text-sm font-semibold text-stone-900 pt-1 tabular-nums">
                  {formatCents(computed)}
                </div>
              </div>
            </div>

            {/* Badges */}
            {(snapshot.optional || snapshot.source === 'ai') && (
              <div className="flex flex-wrap gap-1">
                {snapshot.optional && <OptionalBadge />}
                {snapshot.source === 'ai' && <AISuggestedBadge />}
              </div>
            )}

            {/* Photo + actions */}
            <div className="flex items-center gap-2 pt-1">
              <AttachPhotoButton lineItemId={lineItemId} disabled={readOnly} />
              <LineItemActions
                optional={snapshot.optional}
                onToggleOptional={toggleOptional}
                onDelete={handleDelete}
                disabled={readOnly}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop grid (≥ 640px) ── */}
      <div
        className={`hidden sm:grid min-w-[70rem] grid-cols-[1.75rem_minmax(22rem,1fr)_7rem_5rem_6.5rem_5.5rem_7rem_7rem_2rem] items-start gap-3 px-3 py-3 group ${rowBg} hover:bg-slate-50`}
      >
        <DragHandle
          listeners={listeners as unknown as Record<string, unknown>}
          attributes={attributes as unknown as Record<string, unknown>}
        />
        <div className="min-w-0">
          <textarea
            maxLength={500}
            disabled={readOnly}
            defaultValue={snapshot.description}
            rows={2}
            aria-label="Line item description"
            className="block w-full min-h-10 resize-y text-sm leading-5 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1 py-0.5 disabled:cursor-not-allowed"
            onBlur={(e) => {
              if (e.target.value !== snapshot.description) patch('description', e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') (e.target as HTMLTextAreaElement).value = snapshot.description
            }}
          />
        </div>
        <div className="flex flex-wrap items-start gap-1">
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
          aria-label="Quantity"
          className="w-full text-right text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1 disabled:cursor-not-allowed"
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
          aria-label="Unit price"
          className="w-full text-right text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1 disabled:cursor-not-allowed"
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
          aria-label="Markup percent"
          className="w-full text-right text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1 disabled:cursor-not-allowed"
          onBlur={(e) => {
            const next = clamp(parseFloat(e.target.value || '0'), 0, 1000)
            if (next !== Number(snapshot.markup_pct)) patch('markup_pct', next)
          }}
        />
        <div className="text-right font-semibold text-slate-900 text-sm tabular-nums">
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
