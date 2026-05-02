# Requirements: EstimateFlow

**Defined:** 2026-05-02
**Core Value:** A contractor can create a complete, accurate estimate in under 3 minutes using AI assistance — and send it the same session.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User receives email verification after signup
- [ ] **AUTH-03**: User can reset password via email link
- [ ] **AUTH-04**: User session persists across browser refresh and tab close
- [ ] **AUTH-05**: User can log out from any page

### Organization

- [ ] **ORG-01**: First sign-up creates an organization with the user as owner
- [ ] **ORG-02**: Organization name is set during onboarding (can be edited later)
- [ ] **ORG-03**: organization_members row created with role='owner' on org creation
- [ ] **ORG-04**: All subsequent queries are scoped to the user's organization via RLS

### Dashboard

- [ ] **DASH-01**: Authenticated user lands on dashboard showing their organization context
- [ ] **DASH-02**: Dashboard lists all estimates for the organization (empty state on first load)
- [ ] **DASH-03**: Estimate list shows: estimate number, client name, status, total, last updated
- [ ] **DASH-04**: User can navigate to create a new estimate from the dashboard

### Clients

- [ ] **CLT-01**: User can create a client with name and optional email/phone
- [ ] **CLT-02**: User can view and select existing clients when creating an estimate
- [ ] **CLT-03**: Clients are scoped to the organization

### Estimates

- [ ] **EST-01**: User can create a new estimate with a client, title, and initial section
- [ ] **EST-02**: Estimate receives a sequential number (EST-001, EST-002…) per organization
- [ ] **EST-03**: Estimate has at least one section; sections have a label and ordered line items
- [ ] **EST-04**: User can add, edit, and delete line items within a section
- [ ] **EST-05**: Line items have: description, qty, unit price (cents), markup %, optional flag
- [ ] **EST-06**: Line item totals and estimate grand total computed correctly using integer cents
- [ ] **EST-07**: Server recomputes estimate totals on every save (recalculate_estimate_totals)
- [ ] **EST-08**: Estimate autosaves 800ms after last edit; user sees save indicator
- [ ] **EST-09**: Autosave queue persists to IndexedDB; replays on reconnect (offline support)
- [ ] **EST-10**: User can reorder sections via drag-and-drop (@dnd-kit)
- [ ] **EST-11**: User can reorder line items within a section via drag-and-drop
- [ ] **EST-12**: User can add sections to an estimate
- [ ] **EST-13**: User can delete a section (with confirmation if it has line items)
- [ ] **EST-14**: Estimate status lifecycle: draft → sent (manual status change for MVP)
- [ ] **EST-15**: User can attach photos to a section or line item (upload to Supabase Storage)
- [ ] **EST-16**: User can duplicate an existing estimate

### AI Drafting

- [ ] **AI-01**: User can describe a job and receive an AI-drafted estimate (sections + line items)
- [ ] **AI-02**: AI returns ranges (low/typical/high) for line item pricing, never a single number
- [ ] **AI-03**: AI-generated content is tagged source='ai' in the database
- [ ] **AI-04**: AI-generated sections/items display "Suggested by AI — review before sending" badge
- [ ] **AI-05**: User can accept, edit, or delete any AI-suggested content before saving
- [ ] **AI-06**: Every AI call is logged to ai_usage_events (tokens, cost_cents, model, latency_ms)
- [ ] **AI-07**: AI calls go through /api/ai/draft-estimate Vercel serverless — never client-side

### Billing & Usage

- [ ] **BILL-01**: Free tier limited to 5 estimates per month per organization
- [ ] **BILL-02**: Pro tier allows unlimited estimates per month
- [ ] **BILL-03**: User sees remaining estimate count on dashboard (free tier)
- [ ] **BILL-04**: User is prompted to upgrade when approaching/hitting the free tier limit
- [ ] **BILL-05**: AI features included in both free and pro tiers (no separate AI billing)

## v2 Requirements

### Client Portal & Approval

- **CLIENT-01**: Client can view estimate via unique token link (no login required)
- **CLIENT-02**: Client can approve or decline an estimate from the portal
- **CLIENT-03**: Client signs approval with typed name
- **CLIENT-04**: Contractor receives notification when client approves or declines

### Payments

- **PAY-01**: Contractor connects Stripe account (Stripe Connect Express onboarding)
- **PAY-02**: Client can pay approved estimate via Stripe from the client portal
- **PAY-03**: Payment deposited to contractor's connected Stripe account minus platform fee
- **PAY-04**: Contractor can request partial payment or deposit

### Invoicing

- **INV-01**: Invoice auto-generated from approved estimate
- **INV-02**: Invoice has sequential number per organization (INV-001…)
- **INV-03**: Contractor can send invoice separately from estimate

### Automations

- **AUTO-01**: Contractor can configure automated follow-up reminder schedule
- **AUTO-02**: Automated reminders sent via email (Resend) at configured intervals
- **AUTO-03**: Contractor can configure notification preferences per event type

### Tax

- **TAX-01**: Tax calculated on payment collection via Stripe Tax
- **TAX-02**: Tax rate displayed on client portal before payment

### Photo AI

- **PHOTO-01**: Contractor uploads job site photo; AI analyzes and suggests estimate items
- **PHOTO-02**: Photo analysis goes through /api/ai/analyze-photo serverless endpoint

## Out of Scope

| Feature | Reason |
|---------|--------|
| Client-facing estimate portal | v2 — validate core contractor loop first |
| Online payment collection | v2 — requires Stripe Connect; deferred with client portal |
| Invoice generation | v2 — follows client approval flow |
| Automated follow-up reminders | v2 — automations table is ready; UI deferred |
| Tax calculation | v2 — Stripe Tax natural fit when payments added; no payment in MVP |
| Client approval signature | v2 — typed name only; canvas signature pad post-launch |
| Estimate options (Good/Better/Best) | Post-MVP — schema placeholder exists |
| Mobile native app | Web-first only; responsive web serves mobile |
| Multi-user org (inviting team members) | Post-MVP — org_members table ready; invite flow deferred |
| Estimate PDF export | Post-MVP — printing/export via browser for now |
| OAuth login (Google, GitHub) | Post-MVP — email/password sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| ORG-01 | Phase 1 | Pending |
| ORG-02 | Phase 1 | Pending |
| ORG-03 | Phase 1 | Pending |
| ORG-04 | Phase 1 | Pending |
| DASH-01 | Phase 1 | Pending |
| DASH-02 | Phase 1 | Pending |
| DASH-03 | Phase 1 | Pending |
| DASH-04 | Phase 1 | Pending |
| CLT-01 | Phase 2 | Pending |
| CLT-02 | Phase 2 | Pending |
| CLT-03 | Phase 2 | Pending |
| EST-01 | Phase 2 | Pending |
| EST-02 | Phase 2 | Pending |
| EST-03 | Phase 2 | Pending |
| EST-04 | Phase 2 | Pending |
| EST-05 | Phase 2 | Pending |
| EST-06 | Phase 2 | Pending |
| EST-07 | Phase 2 | Pending |
| EST-08 | Phase 2 | Pending |
| EST-09 | Phase 2 | Pending |
| EST-10 | Phase 2 | Pending |
| EST-11 | Phase 2 | Pending |
| EST-12 | Phase 2 | Pending |
| EST-13 | Phase 2 | Pending |
| EST-14 | Phase 2 | Pending |
| EST-15 | Phase 2 | Pending |
| EST-16 | Phase 2 | Pending |
| AI-01 | Phase 3 | Pending |
| AI-02 | Phase 3 | Pending |
| AI-03 | Phase 3 | Pending |
| AI-04 | Phase 3 | Pending |
| AI-05 | Phase 3 | Pending |
| AI-06 | Phase 3 | Pending |
| AI-07 | Phase 3 | Pending |
| BILL-01 | Phase 3 | Pending |
| BILL-02 | Phase 3 | Pending |
| BILL-03 | Phase 3 | Pending |
| BILL-04 | Phase 3 | Pending |
| BILL-05 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 44 (Phase 1: 13, Phase 2: 19, Phase 3: 12)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-02*
*Last updated: 2026-05-02 — traceability populated by roadmapper*
