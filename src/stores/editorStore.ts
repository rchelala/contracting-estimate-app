import { create } from 'zustand'
import type { EditorEstimate, EditorSection, EditorLineItem, EditorAttachment, FullEstimate } from '../types/editor'
import { lineItemTotal } from '../utils/money'

export interface EditorState {
  estimateId: string | null
  estimate: EditorEstimate | null
  sectionsById: Record<string, EditorSection>
  sectionOrder: string[]
  lineItemsById: Record<string, EditorLineItem>
  lineItemIdsBySection: Record<string, string[]>
  attachmentsById: Record<string, EditorAttachment>
  readOnly: boolean

  hydrate: (full: FullEstimate) => void
  reset: () => void

  // Mutations (local state only — emit queue items via subscribe in useAutosave)
  setEstimateField: (patch: Partial<Pick<EditorEstimate, 'title' | 'client_id' | 'notes'>>) => void
  addSectionLocal: (section: EditorSection) => void
  updateSectionLocal: (id: string, patch: Partial<Pick<EditorSection, 'name' | 'position'>>) => void
  removeSectionLocal: (id: string) => void
  reorderSections: (orderedIds: string[]) => void

  addLineItemLocal: (item: EditorLineItem) => void
  updateLineItemLocal: (id: string, patch: Partial<EditorLineItem>) => void
  removeLineItemLocal: (id: string) => void
  reorderLineItems: (sectionId: string, orderedIds: string[]) => void

  addAttachmentLocal: (att: EditorAttachment) => void
  removeAttachmentLocal: (id: string) => void

  setReadOnly: (readOnly: boolean) => void
  replaceEstimateTotals: (estimate: EditorEstimate) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  estimateId: null,
  estimate: null,
  sectionsById: {},
  sectionOrder: [],
  lineItemsById: {},
  lineItemIdsBySection: {},
  attachmentsById: {},
  readOnly: false,

  hydrate: (full) =>
    set(() => {
      const sectionsById: Record<string, EditorSection> = {}
      const sectionOrder = full.sections
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((s) => {
          sectionsById[s.id] = s
          return s.id
        })
      const lineItemsById: Record<string, EditorLineItem> = {}
      const lineItemIdsBySection: Record<string, string[]> = {}
      for (const id of sectionOrder) lineItemIdsBySection[id] = []
      for (const li of full.lineItems.slice().sort((a, b) => a.position - b.position)) {
        lineItemsById[li.id] = li
        ;(lineItemIdsBySection[li.section_id] ??= []).push(li.id)
      }
      const attachmentsById: Record<string, EditorAttachment> = {}
      for (const a of full.attachments) attachmentsById[a.id] = a
      return {
        estimateId: full.estimate.id,
        estimate: full.estimate,
        sectionsById,
        sectionOrder,
        lineItemsById,
        lineItemIdsBySection,
        attachmentsById,
        readOnly: full.estimate.status !== 'draft',
      }
    }),

  reset: () =>
    set({
      estimateId: null,
      estimate: null,
      sectionsById: {},
      sectionOrder: [],
      lineItemsById: {},
      lineItemIdsBySection: {},
      attachmentsById: {},
      readOnly: false,
    }),

  setEstimateField: (patch) =>
    set((s) => ({ estimate: s.estimate ? { ...s.estimate, ...patch } : s.estimate })),

  addSectionLocal: (section) =>
    set((s) => ({
      sectionsById: { ...s.sectionsById, [section.id]: section },
      sectionOrder: [...s.sectionOrder, section.id],
      lineItemIdsBySection: { ...s.lineItemIdsBySection, [section.id]: [] },
    })),

  updateSectionLocal: (id, patch) =>
    set((s) => ({
      sectionsById: s.sectionsById[id]
        ? { ...s.sectionsById, [id]: { ...s.sectionsById[id], ...patch } }
        : s.sectionsById,
    })),

  removeSectionLocal: (id) =>
    set((s) => {
      const itemIds = s.lineItemIdsBySection[id] ?? []
      const lineItemsById = { ...s.lineItemsById }
      for (const liId of itemIds) delete lineItemsById[liId]
      const sectionsById = Object.fromEntries(Object.entries(s.sectionsById).filter(([k]) => k !== id))
      const lineItemIdsBySection = Object.fromEntries(Object.entries(s.lineItemIdsBySection).filter(([k]) => k !== id))
      return {
        sectionsById,
        sectionOrder: s.sectionOrder.filter((sid) => sid !== id),
        lineItemsById,
        lineItemIdsBySection,
      }
    }),

  reorderSections: (orderedIds) => set({ sectionOrder: orderedIds }),

  addLineItemLocal: (item) =>
    set((s) => ({
      lineItemsById: { ...s.lineItemsById, [item.id]: item },
      lineItemIdsBySection: {
        ...s.lineItemIdsBySection,
        [item.section_id]: [...(s.lineItemIdsBySection[item.section_id] ?? []), item.id],
      },
    })),

  updateLineItemLocal: (id, patch) =>
    set((s) => ({
      lineItemsById: s.lineItemsById[id]
        ? { ...s.lineItemsById, [id]: { ...s.lineItemsById[id], ...patch } }
        : s.lineItemsById,
    })),

  removeLineItemLocal: (id) =>
    set((s) => {
      const item = s.lineItemsById[id]
      if (!item) return s
      const lineItemsById = Object.fromEntries(Object.entries(s.lineItemsById).filter(([k]) => k !== id))
      return {
        lineItemsById,
        lineItemIdsBySection: {
          ...s.lineItemIdsBySection,
          [item.section_id]: (s.lineItemIdsBySection[item.section_id] ?? []).filter((x) => x !== id),
        },
      }
    }),

  reorderLineItems: (sectionId, orderedIds) =>
    set((s) => ({
      lineItemIdsBySection: { ...s.lineItemIdsBySection, [sectionId]: orderedIds },
    })),

  addAttachmentLocal: (att) =>
    set((s) => ({ attachmentsById: { ...s.attachmentsById, [att.id]: att } })),

  removeAttachmentLocal: (id) =>
    set((s) => ({
      attachmentsById: Object.fromEntries(Object.entries(s.attachmentsById).filter(([k]) => k !== id)),
    })),

  setReadOnly: (readOnly) => set({ readOnly }),
  replaceEstimateTotals: (estimate) => set({ estimate }),
}))

/** Compute billable subtotal in integer cents. Advisory — server is authoritative. */
export function computeSubtotalCents(state: EditorState): number {
  let sum = 0
  for (const li of Object.values(state.lineItemsById)) {
    if (li.optional || !li.billable) continue
    sum += lineItemTotal(Number(li.quantity), li.unit_price_cents, Number(li.markup_pct))
  }
  return sum
}
