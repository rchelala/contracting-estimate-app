import { useState } from 'react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useEditorStore } from '../../stores/editorStore'
import { useSyncQueue } from '../../stores/syncQueueStore'
import SectionHeader from './SectionHeader'
import LineItemRow from './LineItemRow'
import AddLineItemButton from './AddLineItemButton'
import DeleteSectionModal from './DeleteSectionModal'
import { nextPosition, reorderPositions } from '../../utils/position'

interface Props {
  sectionId: string
  readOnly: boolean
}

export default function EstimateSection({ sectionId, readOnly }: Props) {
  const section = useEditorStore((s) => s.sectionsById[sectionId])
  const lineItemIds = useEditorStore((s) => s.lineItemIdsBySection[sectionId] ?? [])
  const lineItemsById = useEditorStore((s) => s.lineItemsById)
  const addLineItemLocal = useEditorStore((s) => s.addLineItemLocal)
  const removeSectionLocal = useEditorStore((s) => s.removeSectionLocal)
  const reorderLineItems = useEditorStore((s) => s.reorderLineItems)
  const updateLineItemLocal = useEditorStore((s) => s.updateLineItemLocal)
  const enqueue = useSyncQueue((s) => s.enqueue)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionId,
    disabled: readOnly,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (!section) return null

  function handleAddLineItem() {
    if (!section) return
    const positions = lineItemIds.map((id) => Number(lineItemsById[id]?.position ?? 0))
    const id = crypto.randomUUID()
    const pos = nextPosition(positions)
    addLineItemLocal({
      id,
      organization_id: section.organization_id,
      estimate_id: section.estimate_id,
      section_id: sectionId,
      description: '',
      quantity: 1,
      unit_price_cents: 0,
      markup_pct: 0,
      optional: false,
      taxable: true,
      source: 'contractor',
      ai_price_low_cents: null,
      ai_price_typical_cents: null,
      ai_price_high_cents: null,
      unit: null,
      position: pos,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    enqueue({
      kind: 'lineItem.create',
      item: {
        id,
        organization_id: section.organization_id,
        estimate_id: section.estimate_id,
        section_id: sectionId,
        description: '',
        position: pos,
      },
    })
  }

  function handleConfirmDelete() {
    const idsToDelete = [...lineItemIds]
    removeSectionLocal(sectionId)
    for (const liId of idsToDelete) enqueue({ kind: 'lineItem.delete', id: liId })
    enqueue({ kind: 'section.delete', id: sectionId })
    setConfirmDelete(false)
  }

  function handleDeleteRequest() {
    if (lineItemIds.length === 0) {
      removeSectionLocal(sectionId)
      enqueue({ kind: 'section.delete', id: sectionId })
    } else {
      setConfirmDelete(true)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = lineItemIds.indexOf(String(active.id))
    const newIdx = lineItemIds.indexOf(String(over.id))
    if (oldIdx < 0 || newIdx < 0) return
    const next = [...lineItemIds]
    next.splice(newIdx, 0, next.splice(oldIdx, 1)[0]!)
    reorderLineItems(sectionId, next)
    for (const { id, position } of reorderPositions(next)) {
      updateLineItemLocal(id, { position })
      enqueue({ kind: 'lineItem.update', id, patch: { position } })
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="mb-8">
      <SectionHeader
        sectionId={sectionId}
        readOnly={readOnly}
        onRequestDelete={handleDeleteRequest}
        dragListeners={listeners as unknown as Record<string, unknown>}
        dragAttributes={attributes as unknown as Record<string, unknown>}
      />
      {lineItemIds.length === 0 ? (
        <div className="px-3 py-3 text-slate-400 text-sm">
          No line items yet — add one to get started.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={lineItemIds} strategy={verticalListSortingStrategy}>
            {lineItemIds.map((id, idx) => (
              <LineItemRow key={id} lineItemId={id} index={idx} readOnly={readOnly} />
            ))}
          </SortableContext>
        </DndContext>
      )}
      {!readOnly && <AddLineItemButton onClick={handleAddLineItem} />}
      <DeleteSectionModal
        open={confirmDelete}
        lineItemCount={lineItemIds.length}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
