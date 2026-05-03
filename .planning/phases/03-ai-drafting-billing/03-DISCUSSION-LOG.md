# Phase 3: AI Drafting & Billing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 03-ai-drafting-billing
**Areas discussed:** AI Entry Point & Flow, Price Range Display UX, Free Tier Gate UX, Pro Upgrade Mechanism

---

## AI Entry Point & Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Empty-state CTA on new estimate | Blank estimate shows 'Draft with AI' + 'Start manually' in the empty EstimateBody | ✓ |
| Button in editor header bar | 'Draft with AI ✨' button in EditorHeaderBar alongside Send | |
| Dashboard modal before opening the editor | Modal on 'New Estimate' click with optional job description field | |

**Q: How does the contractor describe the job?**

| Option | Description | Selected |
|--------|-------------|----------|
| Inline textarea in the empty estimate | Textarea expands inline; no modal | ✓ |
| Full-screen modal with textarea | Dedicated modal with Generate button | |

**Q: How does AI-drafted content appear in the editor?**

| Option | Description | Selected |
|--------|-------------|----------|
| Sections + items appear directly in the editor | Populates Zustand store; renders in place | ✓ |
| Preview panel before accepting | Review step before insertion | |

---

## Price Range Display UX

| Option | Description | Selected |
|--------|-------------|----------|
| Range badge, contractor picks one | Compact badge `$500–800≈` in unit price cell; popover on click | ✓ |
| Three separate cells visible | Low / Typical / High columns visible in the row | |

**Q: What price is stored in the DB before contractor picks?**

| Option | Description | Selected |
|--------|-------------|----------|
| Typical value stored immediately | unit_price_cents = typical; autosave works normally | ✓ |
| 0 cents until contractor picks | Requires 'unresolved' state tracking | |

**Q: What happens when contractor clicks the range badge?**

| Option | Description | Selected |
|--------|-------------|----------|
| Small popover with three buttons | Low / Typical / High rows; click to adopt | ✓ |
| Inline expand — three fields replace the cell | Segmented values in-row | |

---

## Free Tier Gate UX

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle line near New Estimate button | '3 of 5 estimates used this month'; amber at 4/5, red at 5/5 | ✓ |
| Persistent banner at top of dashboard | Always-visible usage count | |

**Q: What happens when a free-tier contractor tries to create their 6th estimate?**

| Option | Description | Selected |
|--------|-------------|----------|
| Hard block with upgrade modal | Modal instead of creating estimate | ✓ |
| Creates the estimate but shows warning banner | Soft warning; contractor can keep working | |

**Q: How is estimate count tracked?**

| Option | Description | Selected |
|--------|-------------|----------|
| COUNT(*) from estimates table per org per month | No new table needed | ✓ |
| Dedicated usage_counters table | Faster reads; more infrastructure | |

---

## Pro Upgrade Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder only — manual for MVP | mailto CTA; manually set plan='pro' in Supabase | ✓ |
| Stripe Checkout for subscriptions | Real billing, /api/stripe/create-checkout-session, webhooks | |

**Q: How is org tier tracked in the DB?**

| Option | Description | Selected |
|--------|-------------|----------|
| plan column on organizations table | text, default 'free'; minimal migration | ✓ |
| Separate subscriptions table | More future-proof; overkill for manual MVP | |

**Q: What does the upgrade CTA look like?**

| Option | Description | Selected |
|--------|-------------|----------|
| mailto link to robertchelala@gmail.com | "Email us to upgrade — we'll get you set up in minutes." | ✓ |
| Waitlist / interest form | Typeform or Google Form link | |

---

## Claude's Discretion

- Loading state while AI generates (spinner or skeleton)
- Exact textarea placeholder copy
- Visual treatment of AI badge and range badge
- Whether badge shows full range or span notation
- Error handling copy for failed AI calls

## Deferred Ideas

- Stripe Checkout / subscription billing — v1.1
- Photo analysis (`/api/ai/analyze-photo`) — v2
- Usage analytics dashboard for contractors — post-MVP
