# Phase 1: Auth, Org & Dashboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 01-auth-org-dashboard
**Areas discussed:** Auth UI approach, Org onboarding sequence, Dashboard layout

---

## Auth UI approach

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase Auth UI | @supabase/auth-ui-react — pre-built, handles all modes, ThemeSupa theme | ✓ |
| Custom forms | Full control, hand-rolled, more work | |
| You decide | Defer to Claude | |

**User's choice:** Supabase Auth UI

---

| Option | Description | Selected |
|--------|-------------|----------|
| One page, toggle sign-in/sign-up | Single /auth route, Auth UI handles toggling | ✓ |
| Separate /signup and /login routes | Distinct routes per mode | |

**User's choice:** One page at /auth, toggle between modes

---

## Org onboarding sequence

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated onboarding step | /onboarding before /dashboard, one focused question | ✓ |
| Auto-name from email, edit later | Derive org name from email, skip onboarding | |
| Skip — prompt inline on dashboard | Banner/modal on dashboard | |

**User's choice:** Dedicated /onboarding step

---

| Option | Description | Selected |
|--------|-------------|----------|
| Required | Must enter company name to proceed | ✓ |
| Optional with a default | Skip button, defaults to "My Company" | |

**User's choice:** Required — cannot skip

---

## Dashboard layout

| Option | Description | Selected |
|--------|-------------|----------|
| Top nav bar | Horizontal header, logo left, links right | ✓ |
| Left sidebar nav | Vertical nav, more typical SaaS | |

**User's choice:** Top nav bar

---

| Option | Description | Selected |
|--------|-------------|----------|
| Table with sortable columns | EST # / Client / Status / Total / Updated | ✓ |
| Card grid | Visual cards, less dense | |

**User's choice:** Sortable table

---

| Option | Description | Selected |
|--------|-------------|----------|
| Primary button, top-right of table | "+ New Estimate" above the list | ✓ |
| Also in top nav | Always reachable from any page | |

**User's choice:** Top-right above table only (nav placement deferred to Phase 2)

---

## Claude's Discretion

- Empty state design (copy, illustration vs. plain text)
- Color palette and Tailwind class choices
- Exact error/loading/toast copy
- Org name display location in header

## Deferred Ideas

- "New Estimate" in top nav — Phase 2
- AI-prompted empty state — Phase 3
- Org logo upload — not in MVP
- Estimate table filtering/search — not Phase 1 scope
