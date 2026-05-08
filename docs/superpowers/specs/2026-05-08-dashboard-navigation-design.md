# Dashboard Navigation — Design Spec
_2026-05-08_

## Problem

Two surfaces left users stranded with no path back to the dashboard:

1. **Settings page** — `TopNav` hides the "Estimates" nav link on mobile (`hidden sm:flex`), leaving mobile users with no escape route.
2. **Estimate wizard** — `WizardShell`'s back button is disabled/invisible on step 1, and no other exit exists once the wizard is open.

The estimate editor (`EstimateEditPage`) already has a working back arrow in `EditorHeaderBar` — no changes needed there.

## Design

### Wizard — Home Icon + Leave Confirmation

**Header layout (Option B):**
```
[🏠  ← Back]    New Estimate    [Skip]
```

- `WizardShell` gains an `onHome?: () => void` prop.
- When `onHome` is provided, a `House` icon button (from `@phosphor-icons/react`) renders at the far left of the header. The existing back arrow sits immediately to its right.
- Both buttons use the same style: `text-stone-400 hover:text-stone-600 text-sm`.
- Clicking the home icon sets local state `showLeaveModal: true` inside `WizardShell`.

**Leave confirmation modal:**
- Uses the existing `Modal` component (`src/components/ui/Modal.tsx`).
- Title: `"Leave estimate?"`
- Body: `"Your progress will be lost if you leave now."`
- Footer:
  - "Stay" — secondary button, closes modal (no navigation)
  - "Leave" — primary orange button, resets wizard store (`reset()`) and navigates to `/dashboard`
- Escape key and backdrop click dismiss the modal (already handled by `Modal`).

**Each WizardStep component** passes `onHome` down to `WizardShell`. The navigate and reset logic lives in `WizardShell`, not in the individual steps — steps only supply the prop.

### Settings Page — Home Icon (No Confirmation)

- At the top of `SettingsPage`'s `<main>` content area, above the `<h1>Settings</h1>`, add a `House` icon button.
- Clicking it navigates immediately to `/dashboard` — no confirmation needed.
- Button style matches existing icon buttons: `w-9 h-9 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500`.
- No changes to `TopNav`.

## Files Affected

| File | Change |
|------|--------|
| `src/components/wizard/WizardShell.tsx` | Add `onHome` prop, `House` icon button, local modal state, `Modal` for leave confirmation |
| `src/components/wizard/WizardStep1Client.tsx` | Pass `onHome` to `WizardShell` |
| `src/components/wizard/WizardStep2Location.tsx` | Pass `onHome` to `WizardShell` |
| `src/components/wizard/WizardStep3Capture.tsx` | Pass `onHome` to `WizardShell` |
| `src/components/wizard/WizardStep4Describe.tsx` | Pass `onHome` to `WizardShell` |
| `src/components/wizard/WizardStep5QA.tsx` | Pass `onHome` to `WizardShell` |
| `src/pages/SettingsPage.tsx` | Add home icon button above `<h1>Settings</h1>` |

## Non-Goals

- No changes to `TopNav` or `EditorHeaderBar`.
- No confirmation on the settings home button.
- The wizard's existing back-arrow behavior (step → previous step, disabled on step 1) is unchanged.
