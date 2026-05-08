# Send Estimate via Email — Design Spec

**Date:** 2026-05-08  
**Status:** Approved

---

## Problem

Contractors can currently create and edit estimates, but the "Send" button only marks the estimate as sent in the database — no email is delivered to the client. There is no way for a client to view the estimate without being given a manual link.

---

## Goals

1. Let contractors send an estimate to a client email directly from the editor.
2. Deliver a professional email containing a summary and a link to the full estimate online.
3. Give clients a public, no-login page to view the full estimate breakdown.

---

## Decisions Made

| Question | Decision |
|---|---|
| What does the client receive? | Email summary (title, total, contractor message) + "View Full Estimate" link |
| Send modal fields | To (email), Subject (editable, auto-filled), Message (optional) |
| Re-sending | Allowed any time — each send updates `sent_at` |
| Missing client email | Email field left empty; contractor types manually (does not save back to client record) |
| Client view scope | Full breakdown: all sections, line items, and totals |

---

## Architecture

### 1. `SendEstimateModal` (new)

**File:** `src/components/estimate/SendEstimateModal.tsx`  
**Replaces:** `src/components/estimate/MarkAsSentModal.tsx`

Fields:
- **To** — pre-filled from `client.email` if present, editable, required
- **Subject** — auto-filled as `"Estimate #${number} – ${title}"`, editable
- **Message** — optional textarea, placeholder copy pre-filled

On submit:
1. Calls `sendEstimate()` from `src/services/estimates.ts`
2. Shows loading state on the Send button
3. On success: closes modal, estimate status updates to `sent` (read-only)
4. On error: shows inline error message, modal stays open

The modal can be opened any time — including when the estimate is already `sent` (for resends).

---

### 2. `sendEstimate()` service function (new)

**File:** `src/services/estimates.ts`

```ts
sendEstimate(estimateId: string, to: string, subject: string, message: string): Promise<void>
```

- Gets auth session token
- POSTs to `/api/email/send-estimate` with `{ estimate_id, to, subject, message }`
- Throws on non-2xx response

---

### 3. `/api/email/send-estimate` serverless endpoint (new)

**File:** `api/email/send-estimate.ts`

Authenticated POST. Steps:
1. Verify `Authorization` Bearer token via `createAuthSupabase()`
2. Validate `estimate_id`, `to`, `subject` are present
3. Fetch estimate with sections, line items, and org name using service role client
4. Build HTML email (inline styles, no external CSS)
5. Send via `resend.emails.send()` — from address: `estimates@[configured domain]`
6. Call `markEstimateSent(estimate_id)` to set `status='sent'`, `sent_at`, `first_sent_at` (only if null)
7. Return `{ ok: true }`

Email content:
- Contractor/org name at top
- Contractor's personal message (if provided)
- Estimate title and number
- Section list with subtotals
- Total amount (large, prominent)
- CTA button: **"View Full Estimate"** → `{VITE_APP_URL}/e/{public_token}`

**Env vars needed:**
- `RESEND_API_KEY` (already in `.env.example`)
- `EMAIL_FROM` — sender address e.g. `estimates@estimateflow.app`
- `VITE_APP_URL` — base URL for the client view link

---

### 4. `ClientViewPage` (new)

**File:** `src/pages/ClientViewPage.tsx`  
**Route:** `/e/:token` (public, no auth)

Behavior:
- Fetches estimate by `public_token` using anon Supabase client (RLS already permits this via existing `public can read estimate by token` policy)
- Shows loading skeleton while fetching
- Shows 404 message if token not found
- Renders read-only view:
  - Header bar: EstimateFlow logo + estimate status badge
  - Contractor/org name + sent date
  - Estimate title + number
  - All sections, each with their line items and line totals
  - Subtotal, tax, total footer
  - "Powered by EstimateFlow" footer

No approval button in this iteration (future feature).

---

### 5. Routing

**File:** `src/App.tsx`

Add public route:
```tsx
<Route path="/e/:token" element={<ClientViewPage />} />
```

This route must be outside the authenticated layout wrapper.

---

### 6. Dependency

Install: `resend` npm package (latest v1.x / v2.x stable).

---

## Files Changed

| File | Change |
|---|---|
| `src/components/estimate/SendEstimateModal.tsx` | New — replaces MarkAsSentModal |
| `src/components/estimate/MarkAsSentModal.tsx` | Deleted |
| `api/email/send-estimate.ts` | New serverless endpoint |
| `src/pages/ClientViewPage.tsx` | New public client view |
| `src/pages/EstimateEditPage.tsx` | Swap MarkAsSentModal → SendEstimateModal |
| `src/services/estimates.ts` | Add `sendEstimate()` function |
| `src/App.tsx` | Add `/e/:token` public route |
| `.env.example` | Add `EMAIL_FROM`, `VITE_APP_URL` |
| `package.json` | Add `resend` dependency |

---

## Error Cases

| Scenario | Behavior |
|---|---|
| Email field empty | Send button disabled, inline validation message |
| API returns error | Inline error in modal, estimate status unchanged |
| Token not found in client view | Show "Estimate not found" message |
| Estimate has no client email | Email field is empty; contractor must type one |
| Resend API unavailable | API returns 500, modal shows error |

---

## Not In Scope

- Client approval from the client view page (future)
- Saving the typed email back to the client record
- Email open/click tracking
- PDF attachment
- Bulk send
- Email opt-out / unsubscribe

---

## Verification

1. Open an estimate in draft state → click Send → confirm modal opens with pre-filled subject
2. Submit the form → confirm email arrives in inbox with correct summary and link
3. Click "View Full Estimate" in the email → confirm `/e/:token` loads with correct data
4. Open the same estimate again → click Send → confirm re-send works, `sent_at` updates
5. Open a new estimate with no client attached → confirm email field is empty and editable
6. Enter an invalid/missing email → confirm Send button is disabled or shows validation error
7. Visit `/e/invalid-token` → confirm 404 message renders without crashing
