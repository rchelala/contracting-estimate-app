# Roadmap: EstimateFlow

## Overview

Starting from a complete data layer (Stage 1 — schema, RLS, TypeScript types, money utils), the build proceeds in three vertical slices: first get a contractor through the door with auth and a functional dashboard; then deliver the core product loop with the estimate editor; finally add AI drafting and billing gates to complete the MVP value proposition.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Auth, Org & Dashboard** - Contractor can sign up, land in their workspace, and see their estimate list
- [ ] **Phase 2: Estimate Editor** - Contractor can create, edit, and send a complete estimate with sections, line items, photos, drag-and-drop reorder, and autosave
- [ ] **Phase 3: AI Drafting & Billing** - Contractor can draft an estimate from a job description using AI and is gated on free/pro tier limits

## Phase Details

### Phase 1: Auth, Org & Dashboard
**Goal**: A contractor can sign up, create their organization, and reach a working dashboard that shows their estimates
**Depends on**: Nothing (Stage 1 data layer already merged to main)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, ORG-01, ORG-02, ORG-03, ORG-04, DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. A new contractor can sign up with email and password, verify their email, and land on a dashboard showing their organization name
  2. A returning contractor can log in, stay logged in across browser refresh and tab close, and log out from any page
  3. A contractor who forgot their password can reset it via an emailed link and log back in
  4. The dashboard lists all estimates for the org (empty state on first load) with estimate number, client name, status, total, and last updated
  5. The dashboard has a visible "New Estimate" action that navigates to estimate creation
**Plans**: 4 plans
  - [x] 01-01-PLAN.md — Foundation: stage1 merge, dependencies, Tailwind v4, create_organization RPC, schema push (Wave 1)
  - [x] 01-02-PLAN.md — Auth shell: useAuth, router tree, AuthPage, AuthCallback, RequireAuth (Wave 2)
  - [x] 01-03-PLAN.md — Onboarding: company name form + create_organization RPC wiring (Wave 3)
  - [x] 01-04-PLAN.md — Dashboard: TopNav, estimates table, empty/loading/error states, sign-out popover (Wave 3)
**UI hint**: yes

### Phase 2: Estimate Editor
**Goal**: A contractor can create a complete estimate — with a client, sections, line items, photos, drag-and-drop reorder, and offline autosave — and manually mark it sent
**Depends on**: Phase 1
**Requirements**: CLT-01, CLT-02, CLT-03, EST-01, EST-02, EST-03, EST-04, EST-05, EST-06, EST-07, EST-08, EST-09, EST-10, EST-11, EST-12, EST-13, EST-14, EST-15, EST-16
**Success Criteria** (what must be TRUE):
  1. Contractor can create or select a client, then create a new estimate with a title and at least one section containing line items with qty, unit price, markup %, and optional flag — totals display correctly
  2. Contractor can reorder sections and line items via drag-and-drop; the estimate autosaves within 800ms of the last edit and shows a save indicator
  3. If the contractor goes offline, edits queue locally in IndexedDB and replay automatically on reconnect without data loss
  4. Contractor can attach photos to sections or line items (uploaded to Supabase Storage)
  5. Contractor can duplicate an existing estimate and manually change its status from draft to sent
**Plans**: 5 plans
  - [x] 02-01-PLAN.md — Foundations: install @dnd-kit, estimate-attachments storage bucket, service modules + editor types (Wave 1)
  - [x] 02-02-PLAN.md — Editor state: Zustand store, persisted sync queue, useAutosave/useOnlineStatus/useEstimate hooks (Wave 2)
  - [ ] 02-03-PLAN.md — Editor shell: routes, EditorHeaderBar, ClientDropdown, SaveIndicator, StickyTotalsBar, banners, Modal (Wave 2)
  - [ ] 02-04-PLAN.md — Sections + line items + drag-and-drop + inline cell editing + delete confirmations (Wave 3)
  - [ ] 02-05-PLAN.md — MarkAsSentModal, photo attachments, duplicate from dashboard (Wave 4)
**UI hint**: yes

### Phase 3: AI Drafting & Billing
**Goal**: A contractor can describe a job and receive an AI-drafted estimate to review and edit; free-tier contractors are gated at 5 estimates/month with a clear upgrade prompt
**Depends on**: Phase 2
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, BILL-01, BILL-02, BILL-03, BILL-04, BILL-05
**Success Criteria** (what must be TRUE):
  1. Contractor can type a job description and receive a fully-drafted estimate with sections and line items, each showing low/typical/high price ranges and an "Suggested by AI — review before sending" badge
  2. Contractor can accept, edit, or delete any AI-suggested item before the estimate is saved
  3. Every AI call is logged server-side (tokens, cost, model, latency) and AI content is tagged source='ai' in the database; the Anthropic key is never exposed to the client
  4. Free-tier contractor sees their remaining estimate count on the dashboard and is prompted to upgrade when at or near the 5/month limit; Pro-tier contractor has no limit shown
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth, Org & Dashboard | 0/4 | Not started | - |
| 2. Estimate Editor | 2/5 | In Progress|  |
| 3. AI Drafting & Billing | 0/TBD | Not started | - |
