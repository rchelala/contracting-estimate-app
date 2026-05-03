# Phase 2: Estimate Editor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 02-estimate-editor
**Areas discussed:** Estimate creation flow, Editor layout, Line item editing UX, Save indicator & status transitions

---

## Estimate Creation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Direct to editor | Navigate straight to /estimates/new — editor opens with blank estimate, client picker in header | ✓ |
| Quick-create modal | Modal for client + title before navigating to editor | |

**User's choice:** Direct to editor

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline dropdown with inline create | Searchable dropdown + "New client" expands inline form | ✓ |
| Separate clients page first | Go to /clients to create, then come back | |
| Modal for new client | "Add new client" opens a modal | |

**User's choice:** Inline dropdown with inline create

---

| Option | Description | Selected |
|--------|-------------|----------|
| Immediately on page load | DB row created as soon as /estimates/new loads | ✓ |
| On first save | No DB row until autosave triggers | |

**User's choice:** Immediately on page load

---

## Editor Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Full-page scrolling editor | Single column, sticky totals bar at bottom | ✓ |
| Two-panel (editor + summary) | Left editor panel, right summary/actions panel | |

**User's choice:** Full-page scrolling editor

---

| Option | Description | Selected |
|--------|-------------|----------|
| Always expanded | Sections always show their line items | ✓ |
| Collapsible sections | Click header to collapse/expand | |

**User's choice:** Always expanded

---

## Line Item Editing UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline cell editing | Click cell to edit; Tab moves between fields | ✓ |
| Click row → side panel | Click row to open slide-in panel | |

**User's choice:** Inline cell editing

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden — toggle in row action menu | ⋮ menu with "Mark optional"; badge on optional items | ✓ |
| Always visible checkbox | Checkbox on every row | |

**User's choice:** Hidden — toggle in row action menu (⋮)

---

## Save Indicator & Status Transitions

| Option | Description | Selected |
|--------|-------------|----------|
| Editor header, next to the title | Small "Saved •" or "Saving..." text inline in header | ✓ |
| Top nav bar | Global save status in TopNav | |
| Sticky bottom bar (with totals) | Save indicator in the totals bar | |

**User's choice:** Editor header, next to the title

---

| Option | Description | Selected |
|--------|-------------|----------|
| Button in editor header → confirmation modal | "Send →" → modal → read-only after confirm | ✓ |
| Button with inline confirm (no modal) | Double-click pattern | |
| Status dropdown in header | Dropdown to change status | |

**User's choice:** Button in editor header → confirmation modal

---

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle banner below editor header | Amber banner + save indicator changes to "Queued" | ✓ |
| Save indicator change only | No banner, just indicator changes | |

**User's choice:** Subtle amber banner below editor header

---

## Claude's Discretion

- Exact Tailwind classes and color choices (slate + blue-600 palette from Phase 1)
- "Add line item" button placement (below last item vs + icon in section header)
- Empty state copy
- Photo attachment UI detail (thumbnail strip vs dedicated attachments section)
- Drag-and-drop visual affordances
- Duplicate estimate: accessible from dashboard row action menu

## Deferred Ideas

None — discussion stayed within phase scope.
