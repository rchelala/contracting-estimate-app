# EstimateFlow — Product Specification

> **Source of truth for what we're building.**
> For *how* we build it (stack, conventions, rules), see `CLAUDE.md`.

---

## 1. Product Vision

**One-liner:** Help contractors create professional, accurate estimates in under 3 minutes — and get approval or payment with minimal friction.

EstimateFlow is an AI-assisted estimating SaaS for independent contractors and small contracting businesses. It removes the friction from the estimate-to-payment cycle: from the moment a job is scoped to the moment money lands in the contractor's account.

**Core promise:**
- Estimate creation in < 3 minutes (from blank or AI-drafted)
- Professional client-facing output that gets approved, not ignored
- Payments collected without leaving the platform
- Mobile-first — works on a job site, not just a desk

**AI is an assistant, not a decision-maker.** Every AI output is a draft or suggestion. The contractor reviews, edits, and sends. See §11–17.

---

## 2. Target Users & Personas

### Primary: The Solo Contractor
- Trades: general contractors, electricians, plumbers, HVAC, painters, landscapers, remodelers
- Business size: 1–5 people, often owner-operated
- Pain: estimates take 30–90 minutes, live in spreadsheets or paper, clients ghost them
- Tech comfort: smartphone fluent, desktop occasional
- Motivation: look more professional, get paid faster, spend less time on paperwork

### Secondary: Small Contracting Firm (2–10 employees)
- Has an office manager or admin who handles estimates
- Needs basic multi-user access (owner + estimator roles)
- Cares about consistency across team estimates
- Post-MVP priority; MVP optimizes for the solo contractor

### Out of scope for MVP:
- General-purpose invoicing (FreshBooks, Wave)
- Large GC firms with bid management workflows
- Subcontractor-tier management

---

## 3. Jobs to Be Done (JTBD)

| Job | Current workaround | EstimateFlow solution |
|-----|-------------------|----------------------|
| Turn a job-site conversation into a written estimate | Excel, Google Sheets, pen and paper | AI draft from voice/text description |
| Present a professional estimate to a client | Email PDF, print | Branded public link with approval CTA |
| Get client sign-off without a back-and-forth | Phone call, email thread | One-click approval on the client view |
| Collect a deposit or full payment | Venmo, check, cash | Stripe payment link on the estimate/invoice |
| Reuse pricing from past jobs | Copy-paste from old spreadsheets | Line item history + material price library (post-MVP) |
| Know which estimates are pending vs approved | Memory, email search | Dashboard with live status |

---

## 4. MVP Scope & Non-Goals

### In scope (MVP)
- Account creation and org setup
- Client management (name, contact info, address)
- Estimate creation: sections, line items, quantities, unit prices, markup, optional items
- AI-assisted estimate drafting from text description
- AI photo analysis for scope suggestions
- Tax calculation (ZIP-based, see §5.3)
- PDF generation from estimate
- Public estimate link with approval flow (typed name)
- Stripe payment collection (deposit or full amount) on approved estimate
- Invoice generation from approved estimate
- Basic email notifications via Resend (estimate sent, approved, payment received)
- Dashboard: estimate list with status

### Post-MVP (intentionally deferred)
- Estimate options (Good/Better/Best tiers)
- Material price library / line item history
- Canvas signature pad for approval
- Recurring automations / reminder scheduling
- Subcontractor management
- Multi-user / team roles beyond owner
- QuickBooks / accounting integrations
- Native mobile app (PWA first)
- Estimate versioning / change orders

### Non-goals (never)
- General-purpose invoicing unrelated to estimates
- Time tracking
- CRM / lead pipeline
- Payroll

---

## 5. Estimate Features

### 5.1 Line Items & Sections

An estimate is organized as:
- **Sections** — named groups (e.g., "Demo", "Framing", "Electrical rough-in"). Ordered by `position` (gaps: 10, 20, 30).
- **Line items** — belong to a section. Each has: description, quantity, unit, unit price (cents), markup %, and an optional flag.

Line items with `optional: true` are shown to the client with a checkbox. Optional items are excluded from the base total unless the client selects them. The server recomputes totals after approval based on which optional items are checked.

### 5.2 Markup, Optional Items, Totals

**Line item total** = `quantity × unit_price_cents × (1 + markup_pct / 100)`

**Section subtotal** = sum of non-optional line item totals + any selected optional items

**Estimate subtotal** = sum of all section subtotals

**Tax** = see §5.3

**Grand total** = subtotal + tax

All totals are computed by the `recalculate_estimate_totals(estimate_id)` Postgres function. Client-side totals are advisory (display only). The server value is authoritative for invoices and payments.

### 5.3 Tax — ZIP-Based Lookup (MVP)

Tax is computed using a hand-rolled ZIP code lookup:
- A `tax_rates` table stores `zip_code → combined_rate_pct` (state + county + city, pre-loaded from a public dataset).
- The estimate header stores `tax_zip` (defaults to the client's billing ZIP) and `tax_rate_pct` (snapshotted at the time of calculation — never recalculated retroactively on sent estimates).
- Tax is applied to taxable line items only. Each line item has a `taxable` boolean (default true).
- The contractor can override the tax rate manually for any estimate.

**Limitations (acceptable for MVP):**
- ZIP-level granularity only (no street-address precision)
- Rates are periodically refreshed from a public dataset, not real-time
- No product-category tax rules (e.g., labor vs. materials)

Post-MVP: evaluate Stripe Tax or TaxJar if accuracy demands increase.

### 5.4 Attachments & Photos

- Contractors can attach photos to a section or a specific line item.
- Photos are uploaded to Supabase Storage (`estimate-attachments` bucket, private).
- A thumbnail is generated by an Edge Function on insert.
- Photos are shown in the client-facing view (contractor can toggle per-photo).
- AI can analyze photos to suggest line items (see §13).

---

## 6. Client Experience

The public estimate view is an unauthenticated page at:
```
/e/:estimate_public_token
```

`estimate_public_token` is a cryptographically random 32-char token (not the UUID). The token grants read + approval access to that specific estimate only.

**Page structure:**
1. Contractor's business name and logo (from org profile)
2. Estimate number, date, expiry date
3. Client name and job address
4. Sections and line items (grouped, with optional-item checkboxes)
5. Totals (subtotal, tax, grand total — updates live as optional items are toggled)
6. Approval block: typed name field + "I approve this estimate" button
7. Payment block (visible after approval if a payment request is attached)

**Approval flow:**
1. Client types their full name and clicks approve.
2. System records: `approved_by_name`, `approved_at`, `client_ip`, `user_agent`.
3. Estimate status → `approved`.
4. Contractor receives email notification.
5. If a deposit or full-payment request is attached, the payment block becomes active.

**Expiry:** Estimates can have an `expires_at`. Expired estimates show a banner but can still be approved (contractor's choice to enforce expiry is post-MVP).

---

## 7. Payments & Stripe Connect

### Architecture
- Contractors onboard via Stripe Connect Express.
- Clients pay through the EstimateFlow platform; Stripe routes payouts to the contractor's connected account.
- Platform fee: 0% at launch (configurable per org in `organizations.platform_fee_pct`).

### Payment request
When creating a payment request on an estimate, the contractor chooses:
- **Deposit**: fixed amount or percentage of grand total
- **Full payment**: entire grand total

A Stripe PaymentIntent is created at this point (server-side, `/api/stripe/create-payment-intent`).

### Client payment flow
1. Client approves estimate (§6).
2. Payment block renders a Stripe Elements card form.
3. On submit, the PaymentIntent is confirmed.
4. On success: invoice is generated, contractor notified, `payments` record created.

### Webhooks
- `/api/stripe/webhook` handles: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated` (Connect onboarding), `charge.refunded`.
- Webhook handler is idempotent (checks `stripe_events` table before processing).
- Signature verified with `STRIPE_WEBHOOK_SECRET`.

---

## 8. Invoices

- An invoice is generated automatically when a payment is completed, OR manually by the contractor from an approved estimate.
- Invoice number uses the same per-org sequence as estimates but with an `INV-` prefix.
- Invoice status: `draft` → `sent` → `paid` → `void`.
- Invoices are read-only snapshots of the estimate at the time of generation (totals are not recalculated).
- PDF generation is shared between estimates and invoices.

---

## 9. Email & Notifications

All email is sent via Resend from `/api/email/*` serverless functions.

| Trigger | Recipient | Template |
|---------|-----------|----------|
| Contractor sends estimate | Client | Estimate ready — includes public link |
| Client approves estimate | Contractor | Estimate approved by [name] |
| Client makes payment | Contractor | Payment received — $X |
| Estimate approaching expiry (3 days) | Contractor | Estimate #EST-0012 expires soon |
| Invoice sent | Client | Invoice from [business name] |

Email templates are stored as React Email components in `src/emails/`. Resend API key stays server-side only.

---

## 10. Automations

Automations are editable rules stored in the `automations` table. MVP ships with:
- Estimate expiry reminder (configurable: 3 days, 7 days, or off)
- "Following up" reminder to contractor if estimate is unseen by client after X days

Automations run via a scheduled Supabase Edge Function (cron). Full automation builder (custom triggers, multi-step) is post-MVP.

---

## 11. AI — Overview & Principles

EstimateFlow uses Anthropic Claude via server-side API calls only. There are two AI entry points:

1. **Draft estimate** — contractor describes a job in natural language; AI returns a structured estimate draft.
2. **Photo analysis** — contractor uploads a photo; AI identifies visible work scope and suggests line items.

**Core principles:**
- AI never sends, approves, or charges anything.
- AI output is always presented as a draft requiring contractor review.
- AI returns ranges (low / typical / high), never a single authoritative number.
- Every AI-generated section and line item is tagged `source: 'ai'` in the DB.
- The UI renders a "Suggested by AI — review before sending" badge on all AI-sourced content.
- Every AI call is logged to `ai_usage_events` (see §16).

---

## 12. AI — Draft Estimate

**Endpoint:** `POST /api/ai/draft-estimate`

**Input:**
```json
{
  "description": "string — contractor's free-text job description",
  "organization_id": "uuid",
  "estimate_id": "uuid — pre-created estimate to populate"
}
```

**Behavior:**
1. Validate the request is from an authenticated user who belongs to the org.
2. Send the description + a structured prompt to Claude requesting JSON output.
3. Parse and validate the returned JSON (sections + line items with low/typical/high unit prices).
4. Insert sections and line items into the DB, all tagged `source: 'ai'`.
5. Trigger `recalculate_estimate_totals`.
6. Log to `ai_usage_events`.
7. Return the created section/item IDs to the client.

**Output format** (from Claude, before DB insert):
```json
{
  "sections": [
    {
      "name": "string",
      "line_items": [
        {
          "description": "string",
          "quantity": number,
          "unit": "string",
          "unit_price_low_cents": integer,
          "unit_price_typical_cents": integer,
          "unit_price_high_cents": integer,
          "markup_pct": number,
          "taxable": boolean
        }
      ]
    }
  ]
}
```

The contractor sees all three price points and picks one (or edits freely). The chosen value becomes `unit_price_cents` on the line item.

---

## 13. AI — Photo Analysis

**Endpoint:** `POST /api/ai/analyze-photo`

**Input:** multipart form with `photo` (JPEG/PNG, max 10 MB) + `estimate_id`.

**Behavior:**
1. Validate auth + org membership.
2. Send the image to Claude with a prompt asking for visible scope of work.
3. Return a list of suggested line items (same low/typical/high structure as §12).
4. Do NOT auto-insert — return suggestions to the client for contractor review.
5. Log to `ai_usage_events`.

**Rationale for no auto-insert:** Photo analysis is lower-confidence than a text description the contractor authored. Requiring explicit acceptance reduces AI-induced errors.

---

## 14. AI — Output Format

All AI price suggestions use a **range format**:

| Field | Meaning |
|-------|---------|
| `unit_price_low_cents` | Conservative / budget end |
| `unit_price_typical_cents` | Market rate, recommended default |
| `unit_price_high_cents` | Premium / expedited end |

The contractor selects or edits the value. The selected value is stored as `unit_price_cents`. The range values are stored for analytics (measuring how much contractors adjust AI suggestions).

AI-generated content carries `source: 'ai'` in the DB. Contractor-edited content carries `source: 'contractor'`. Once a contractor edits an AI item, the source flips to `'contractor'`.

---

## 15. AI Rules — AI Never Auto-Acts

This rule is absolute and has no exceptions:

- **AI never sends an estimate.** Only the contractor can click "Send to client."
- **AI never approves an estimate.** Only the client (or contractor on their behalf) can approve.
- **AI never initiates a charge.** Payment flows are always explicitly triggered.
- **AI never modifies a sent estimate.** Once an estimate is sent, the AI cannot alter it.
- **AI output is always staged as a draft.** The contractor must explicitly accept or dismiss AI suggestions before they affect the estimate.

Any feature request or edge case that would require AI to take an action on behalf of a user without explicit confirmation must be declined.

---

## 16. AI — Usage Logging

Every AI API call must log a row to `ai_usage_events`:

| Column | Value |
|--------|-------|
| `estimate_id` | The estimate being worked on |
| `user_id` | Authenticated contractor |
| `organization_id` | Org context |
| `model` | e.g., `claude-sonnet-4-6` |
| `call_type` | `draft_estimate` \| `analyze_photo` |
| `input_tokens` | From Anthropic response |
| `output_tokens` | From Anthropic response |
| `cost_cents` | Computed from token counts + model pricing |
| `latency_ms` | Wall-clock time for the API call |
| `created_at` | Timestamp |

This logging is non-optional. It is needed for metering, cost accounting, and the AI edit-distance success metric (§20).

---

## 17. AI — Pricing

AI features are **included by default** on all plans (Free and Pro).

- No separate AI add-on or usage meter shown to the user at launch.
- Cost is absorbed into plan pricing.
- `ai_usage_events` table is in place so metering can be introduced later if costs require it without a schema change.
- If per-org AI spend exceeds a threshold (initially $50/org/month), an internal alert fires for manual review. This is an ops safeguard, not user-facing.

---

## 18. Auth & Multi-Tenancy

### Auth
- Supabase Auth with email + password and magic link.
- Session managed by Supabase client SDK (`supabase.auth.getSession()`).
- JWT passed in `Authorization` header for all API calls.

### Multi-tenancy
- Every domain table has `organization_id uuid NOT NULL`.
- RLS policies filter on `organization_members` — a user can only see/modify rows belonging to their org.
- Default RLS posture: **deny all**, then grant selectively.
- `organization_members` roles: `owner`, `member` (post-MVP: `estimator`, `viewer`).
- MVP: single org per user account. Multi-org support is a schema concern only at this stage.

### Org onboarding flow
1. User signs up → Supabase creates `auth.users` row.
2. App creates `organizations` row + `organization_members` row with role `owner`.
3. Org setup screen: business name, logo upload, default tax ZIP, Stripe Connect onboarding.

---

## 19. Billing & Plan Tiers

### Tier structure

| Feature | Free | Pro ($29/mo) |
|---------|------|-------------|
| Estimates per month | 5 | Unlimited |
| Clients | 10 | Unlimited |
| AI draft / photo analysis | 10 calls/mo | Unlimited |
| PDF generation | ✓ | ✓ |
| Stripe payment collection | ✓ | ✓ |
| Custom branding (logo) | — | ✓ |
| Email reminders / automations | — | ✓ |
| Priority support | — | ✓ |

- **No per-user fees.** Flat monthly per org.
- **Free tier** is designed for solo contractors trying the product, not as a permanent plan.
- Estimate count resets on billing cycle date.
- Plan enforcement happens server-side (check org plan + usage before allowing estimate creation).
- Billing via Stripe Billing (not Connect — this is platform subscription revenue).

---

## 20. Success Metrics

### Primary (launch targets, 90 days post-launch)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time-to-first-estimate | < 3 min (median) | `estimates.created_at` → `estimates.first_sent_at` |
| Estimate approval rate | > 60% of sent estimates | `estimates` where `status = 'approved'` / `status IN ('sent','approved','rejected')` |
| Payment capture rate | > 40% of approved estimates | `payments` linked to approved estimates |
| AI adoption | > 50% of new estimates use AI draft | `estimates` with at least one `source = 'ai'` line item |

### AI quality metrics

| Metric | Purpose | Measurement |
|--------|---------|-------------|
| AI edit distance | How much do contractors change AI output? | Levenshtein / field-level diff between AI-suggested and final sent values |
| AI acceptance rate | What % of AI line items survive to send? | `source = 'ai'` items present on sent estimate / total AI items drafted |
| AI price accuracy | How close are AI typical prices to contractor-chosen prices? | `(contractor_unit_price - ai_typical_price) / ai_typical_price` distribution |

These metrics are computable from `ai_usage_events` + `estimate_line_items.source` + final line item values. No additional instrumentation required at launch — the schema already captures what's needed.

### Health metrics (ongoing)

- Supabase DB connection pool saturation
- Vercel function p99 latency (AI endpoints target < 8s)
- Stripe webhook delivery success rate
- Error rate in `ai_usage_events` (null `output_tokens` = failed call)
