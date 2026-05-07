# Estimate Creation Wizard — Design Spec

**Date:** 2026-05-07
**Status:** Approved
**Feature:** New Estimate Wizard Flow

---

## Overview

Replace the current inline AI drafting trigger (empty estimate state textarea) with a dedicated 5-step full-screen wizard that collects context before AI generation. The wizard runs before the estimate editor opens — when complete, the editor opens pre-populated with AI-drafted content.

**Core value:** A contractor on a job site can walk through the full wizard in under 60 seconds (skip all steps, answer AI questions) and have a complete draft estimate waiting. The richer the input, the more accurate the draft.

---

## Wizard Architecture

- **Dedicated full-screen flow** — separate from the estimate editor (not a modal or sidebar).
- **Entry point:** "New Estimate" button on Dashboard → mounts the wizard.
- **5 steps** with consistent chrome: progress bar, Back link (top-left), step label (top-center), Skip link (top-right).
- **Progress bar:** fills proportionally (20% → 40% → 60% → 80% → 100% amber at Step 5).
- **Every step is skippable** — Skip link always present. Skipping a step advances to the next with no data from that step.
- **Back** navigates to the previous step (does not discard data already entered).
- On wizard completion the estimate editor opens with pre-populated content.

---

## Step 1 — Client

**Purpose:** Attach a client to the estimate before drafting.

**UI:**
- Search field with magnifier icon (filters existing clients by name/email).
- Results list with avatar initials, name, email. Tapping a result selects it (highlighted row).
- "New client" row at the bottom of the list — expands inline to name (required) + phone/email (optional).
- Continue button enabled once a client is selected or new client name is entered.
- Skip bypasses client assignment — estimate opens unassigned; client can be added from the editor.

**Data collected:** `client_id` (existing) or client creation payload (name, phone, email).

---

## Step 2 — Location

**Purpose:** Capture ZIP code for AI regional pricing and future tax rate lookup.

**UI:**
- Single large centered ZIP input: large font (28px), letter-spacing, numeric keyboard on mobile, 5-char max.
- Explanatory note: "Helps AI estimate local labor and material costs. Also used for tax rates when payments are added."
- Continue enabled once 5 digits entered.
- Skip bypasses ZIP — AI falls back to national average rates.

**Data collected:** `zip_code` (string, 5 digits).

---

## Step 3 — Capture the Job

**Purpose:** Upload photos and/or video for AI visual analysis.

**UI:**
- 3-column thumbnail grid. Each uploaded photo shows a thumbnail with an ✕ remove button.
- Empty slots show a "+" dashed placeholder.
- Three upload buttons below the grid: Camera, Library, Video.
- Up to 10 photos; 1 optional video clip.
- Desktop: file picker opens for camera/library buttons.
- Mobile: camera opens native camera; library opens photo picker.
- Continue enabled immediately (grid can be empty — skip is implicit via Continue with no uploads).
- Skip jumps to Step 4 with no media attached.

**Data collected:** Array of Supabase Storage paths (photos + optional video URL).

---

## Step 4 — Describe the Job

**Purpose:** Collect a natural-language job description (typed or voice-transcribed).

**UI:**
- Large textarea (min ~90px height), placeholder: "e.g. Replace roof on 2,000 sq ft home, tear-off needed, been leaking in the northeast corner for 2 weeks..."
- Floating mic button inside the textarea (bottom-right corner). Tapping starts recording; words appear in real-time.
- Tip banner below textarea: "Tap 🎤 to speak — your words appear here automatically."
- Continue enabled immediately (textarea can be empty — AI works from photos alone if Step 3 had uploads).
- Skip bypasses description entirely.

**Data collected:** `description` (string, may be empty).

---

## Step 5 — AI Q&A

**Purpose:** AI reviews all input from Steps 1–4 and asks targeted follow-up questions before drafting.

### Two display modes (toggle, persists for session):

**Chat Mode (default):**
- Header shows "Show all" toggle link (top-right).
- Title: "A few quick questions" · subtitle: "Step 5 of 5 · Question N of ~N".
- Completed questions shown above (greyed/faded) with contractor's answer.
- Current question in a blue left-border box.
- Answer input with inline mic button (same voice pattern as Step 4).
- "Skip question →" link (skips just this question, advances to the next).
- "Send" button submits the answer and loads the next question.
- When all questions are answered or skipped, "Generate Estimate →" button appears.

**Show All Mode (toggled):**
- Header shows "One at a time" toggle link (top-right).
- Title: "AI follow-up questions" · subtitle: "Answer what you know — skip the rest."
- All questions rendered as a form. Answered questions shown greyed with answer pre-filled.
- Current question highlighted (bold label).
- Skipped / unanswered questions left blank — AI treats as unknown.
- "Generate Estimate →" amber button at the bottom.

**Question count:** 3–6 questions depending on job complexity. AI infers how many are necessary.

**Data collected:** Array of `{ question: string, answer: string | null }` pairs.

---

## Generating Screen

**Purpose:** Full-screen loading state while AI drafts the estimate server-side.

**UI:**
- Robot icon with pulse ring animation.
- Heading: "Drafting your estimate…"
- Status summary: "Analyzing N photos + your description / Factoring in zip XXXXX rates / Building sections and line items."
- Animated progress checklist:
  - ✓ Reviewed job description (completes first)
  - ✓ Analyzed photos (completes second)
  - ⟳ Writing line items… (spinner, in progress)
  - ○ Applying XXXXX labor rates (pending)

**Backend:** POST to `/api/ai/draft-estimate` with all wizard data. Logs to `ai_usage_events`.

---

## Editor Handoff

On completion, the estimate editor opens with:

- All sections and line items pre-populated from AI output.
- Every AI-generated item tagged `source: 'ai'` in the DB.
- Every AI item renders a **"Suggested by AI — review before sending"** badge.
- Unit price cells show a **range picker badge (Low / Typical / High)** until the contractor explicitly picks or edits a value.
- Autosave starts immediately.
- Client and ZIP are attached to the estimate if provided in Steps 1–2.

---

## Skip Behavior Summary

| Step | If Skipped |
|------|-----------|
| 1 — Client | Estimate created with no client; assignable later in editor |
| 2 — Location | AI uses national average rates; no tax rate stored |
| 3 — Capture | AI works from description only |
| 4 — Describe | AI works from photos only (if any) |
| 5 — Q&A questions | AI treats unanswered questions as unknown; drafts with less context |

The minimum viable path: skip Steps 1–4, answer just the AI questions (or skip those too with Show All → Generate). Wizard completes in under 60 seconds.

---

## Data Model Notes

The wizard collects inputs that are all passed to `/api/ai/draft-estimate`:

```
{
  estimate_id: string          // created at wizard start (draft status)
  client_id?: string
  zip_code?: string
  photo_paths: string[]        // Supabase Storage paths
  video_path?: string
  description?: string
  qa_pairs: { question: string, answer: string | null }[]
}
```

No new tables required. AI Q&A pairs are ephemeral (not persisted beyond the AI call).

---

## Out of Scope (this spec)

- Real-time streaming of AI-generated line items (generating screen polls or waits for response).
- Voice transcription backend (Step 4 and Step 5 mic use the Web Speech API or a future transcription service — implementation detail, not spec'd here).
- Client portal / approval flow — v1.1.
- Tax rate lookup from ZIP — stored for v1.1, not used in MVP.
