# Quick Task 260529-5wm: Summary

**Completed:** 2026-05-29

## What changed

`src/hooks/useVoiceInput.ts` — Added iOS detection in the `onerror` handler.
When `not-allowed` or `service-not-allowed` fires on an iPhone/iPad/iPod, the error
message now reads:

> "Microphone access denied. On iPhone: Settings → Apps → Safari → Microphone → Allow"

On all other platforms the message remains:

> "Microphone access denied. Check browser permissions in Settings."

Both wizard steps (`WizardStep4Describe`, `WizardStep5QA`) render this string directly,
so both benefit without additional changes.
