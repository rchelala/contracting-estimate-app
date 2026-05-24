# Phase 2: Estimate Editor - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A contractor can create a complete estimate — with a client, sections, line items, photos, drag-and-drop reorder, and offline autosave — and manually mark it sent. Covers the full estimate editing loop: creation, real-time editing, server-recomputed totals, offline queue, photo attachments, and status transition to 'sent'.

Client-facing view, AI drafting, billing gates, and invoice generation are out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Estimate Creation Flow

- **D-01:** "New Estimate" navigates directly to `/estimates/new` — no modal or intermediate step. The editor opens immediately with a blank estimate.
- **D-02:** A new estimate row (with sequential EST-number and status='draft') is created in the database immediately when `/estimates/new` loads. No 'unsaved new estimate' state to manage in the Zustand store.
- **D-03:** Client is selected via an inline searchable dropdown in the estimate header. If the client doesn't exist, a "New client" option expands an inline form (name + optional email/phone) without navigating away. No separate /clients page required for Phase 2.

### Editor Layout

- **D-04:** Full-page scrolling editor layout — single column, consistent with existing pages (dashboard, auth, onboarding). No two-panel split.
- **D-05:** Structure from top to bottom: TopNav → editor header bar → sections (always expanded) → sticky totals bar at the viewport bottom.
- **D-06:** The editor header bar contains: client dropdown (left), estimate title (editable inline, center-left), save indicator (right of title), and "Send →" button (far right).
- **D-07:** Sections are always expanded — no collapse/expand toggle. Simpler to build; keeps all line items visible during editing.
- **D-08:** The sticky bottom bar shows: Subtotal / Tax (if applicable) / Total — all in integer-cents formatted via `money.ts`. This bar is visible at all times while in the editor.

### Line Item Editing UX

- **D-09:** Inline cell editing — clicking any cell on a line item row activates edit mode for that row. Tab moves between fields (Description → Qty → Unit Price → Markup %). Feels like a spreadsheet. No side panel.
- **D-10:** The 'optional' flag is hidden from the main row view. Each row has a ⋮ action menu containing "Mark optional" / "Remove optional" and "Delete". Optional line items display a small "Optional" badge inline.
- **D-11:** Drag handle (≡) is visible on the left of each section header and each line item row for drag-and-drop reorder via @dnd-kit.

### Save Indicator & Status Transitions

- **D-12:** Autosave indicator lives in the editor header bar, right of the estimate title. States: "Saving..." (during debounce/write), "Saved ✓" (after successful write), "Queued" (offline — changes in IndexedDB), "Error" (failed write with retry option).
- **D-13:** Offline state shows a slim amber banner below the editor header: "You're offline — changes are saved locally and will sync when you reconnect." The banner is dismissible. No blocking UI.
- **D-14:** "Mark as Sent" is triggered by the "Send →" button in the editor header. Clicking opens a confirmation modal: "Mark EST-001 as sent? You won't be able to edit it after this." with Cancel / "Mark as Sent". After confirmation: status badge updates to 'Sent', estimate becomes read-only (all fields disabled), and save indicator is replaced with the Sent status badge.

### Claude's Discretion

- Exact Tailwind classes and color choices — maintain the neutral slate + blue-600 palette from Phase 1.
- Whether "Add line item" is a button below the last item in a section or a + icon in the section header.
- Exact copy for empty states (e.g., "No line items yet — add one to get started").
- Photo attachment UI detail — thumbnail strip below the line item row or a dedicated attachments section under each section; either is acceptable.
- Drag-and-drop visual affordances (ghost, drop indicator color, handle visibility on hover vs always).
- Duplicate estimate: accessible from dashboard row action menu (⋮ on each estimate row) — exact placement is Claude's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `CLAUDE.md` — Operating manual: stack constraints, non-negotiable rules (multi-tenancy, money as cents, RLS, no VITE_-prefixed secrets), editor architecture (Zustand store, autosave, offline queue, @dnd-kit)
- `.planning/REQUIREMENTS.md` — Acceptance criteria for Phase 2: CLT-01–03, EST-01–16
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, and dependency on Phase 1

### Data Layer (Stage 1 — complete)
- `supabase/migrations/` — All migrations; agents should read the estimates, estimate_sections, estimate_line_items, estimate_attachments, clients, and estimate_sequences migrations for column definitions and constraints
- `src/types/database.types.ts` — Generated TypeScript types for all tables (source of truth for column names/types)

### Prior Phase Context
- `.planning/phases/01-auth-org-dashboard/01-CONTEXT.md` — Phase 1 decisions: TopNav pattern, color palette, button styles, auth lifecycle

### Existing Utilities (read before implementing)
- `src/utils/money.ts` — Integer-cents arithmetic; use for all total computations and display formatting
- `src/lib/supabase.ts` — Supabase client singleton; all DB queries go through this
- `src/services/estimates.ts` — Existing estimate list query pattern to follow for new estimate service functions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/StatusBadge.tsx` — Colored pill badge for estimate_status; already handles 'draft' and 'sent' variants
- `src/components/layout/TopNav.tsx` — Shared top nav with logo, nav links, avatar — reuse as-is in the editor page
- `src/utils/money.ts` — `formatCents()` for totals bar display; `lineItemTotal()` and `applyMarkup()` for client-side UX computations
- `src/utils/dates.ts` — `formatRelativeDate()` for last-saved timestamps
- `src/services/estimates.ts` — Pattern for Supabase queries; extend with `getEstimate`, `createEstimate`, `updateEstimate` functions
- `src/services/organizations.ts` — Pattern for membership lookups; useful for org_id retrieval needed for new estimate creation

### Established Patterns
- All pages use `useAuth()` hook for session; same pattern applies to editor
- Services are plain async functions (not classes); follow same pattern for estimate/client/section/line-item services
- TypeScript strict — no `any`; use generated `Database` types from `database.types.ts`
- Named exports for services/utils; default export for React components
- Tailwind CSS only — no inline styles, no CSS modules

### Integration Points
- Dashboard "New Estimate" button already navigates to `/estimates/new` — the route just needs a page component
- Dashboard table row click already navigates to `/estimates/:id` — same editor component handles both new and existing
- `recalculate_estimate_totals(estimate_id)` Postgres function must be called after every save (already exists in DB)
- `next_estimate_number(organization_id)` called on estimate creation to assign EST-number
- Supabase Storage for photo uploads — bucket must be configured with org-scoped RLS

</code_context>

<specifics>
## Specific Ideas

- The estimate editor is the core of the product — it should feel fast and direct, like a lightweight spreadsheet tool, not a heavy form.
- Tab-through editing on line items (D-09) is key to the "under 3 minutes" core value — make it feel fluid.
- The "immediately persist on load" pattern (D-02) means the dashboard will show a new blank estimate immediately — the duplicate/delete from dashboard needs to handle these gracefully.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-estimate-editor*
*Context gathered: 2026-05-03*
