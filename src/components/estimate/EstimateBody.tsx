import { useMemo } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useEditorStore } from '../../stores/editorStore'
import { useSyncQueue } from '../../stores/syncQueueStore'
import EstimateSection from './EstimateSection'
import AddSectionButton from './AddSectionButton'
import EmptyEstimate from './EmptyEstimate'
import { nextPosition, reorderPositions } from '../../utils/position'

export default function EstimateBody() {
  const estimate = useEditorStore((s) => s.estimate)
  const sectionOrder = useEditorStore((s) => s.sectionOrder)
  const sectionsById = useEditorStore((s) => s.sectionsById)
  const readOnly = useEditorStore((s) => s.readOnly)
  const addSectionLocal = useEditorStore((s) => s.addSectionLocal)
  const reorderSections = useEditorStore((s) => s.reorderSections)
  const updateSectionLocal = useEditorStore((s) => s.updateSectionLocal)
  const enqueue = useSyncQueue((s) => s.enqueue)
  const pointerSensorOptions = useMemo(
    () => ({ activationConstraint: { distance: 4 } }),
    [],
  )
  const pointerSensor = useSensor(PointerSensor, pointerSensorOptions)
  const sensors = useSensors(pointerSensor)

  if (!estimate) return null

  function handleAddSection() {
    if (!estimate) return
    const positions = sectionOrder.map((id) => sectionsById[id]?.position ?? 0)
    const id = crypto.randomUUID()
    const pos = nextPosition(positions)
    const name = `Section ${sectionOrder.length + 1}`
    addSectionLocal({
      id,
      organization_id: estimate.organization_id,
      estimate_id: estimate.id,
      name,
      position: pos,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    enqueue({
      kind: 'section.create',
      section: {
        id,
        organization_id: estimate.organization_id,
        estimate_id: estimate.id,
        name,
        position: pos,
      },
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sectionOrder.indexOf(String(active.id))
    const newIdx = sectionOrder.indexOf(String(over.id))
    if (oldIdx < 0 || newIdx < 0) return
    const next = [...sectionOrder]
    next.splice(newIdx, 0, next.splice(oldIdx, 1)[0]!)
    reorderSections(next)
    for (const { id, position } of reorderPositions(next)) {
      updateSectionLocal(id, { position })
      enqueue({ kind: 'section.update', id, patch: { position } })
    }
  }

  if (sectionOrder.length === 0) return <EmptyEstimate onAddSection={handleAddSection} />

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          {sectionOrder.map((id) => (
            <EstimateSection key={id} sectionId={id} readOnly={readOnly} />
          ))}
        </SortableContext>
      </DndContext>
      {!readOnly && <AddSectionButton onClick={handleAddSection} />}
    </div>
  )
}
