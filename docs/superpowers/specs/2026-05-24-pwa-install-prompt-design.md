# PWA Install Prompt — Design Spec

**Date:** 2026-05-24  
**Status:** Approved

---

## Problem

EstimateFlow now supports PWA installation (manifest, service worker, icons shipped in the previous commit). However, contractors have no in-app guidance on how to install it. On Android, Chrome can show a native install prompt but only if the app catches the browser event. On iOS, Safari never triggers an automatic prompt — users must go through Share → Add to Home Screen manually, and will not discover this on their own.

## Goal

Give contractors a clear, low-friction path to install EstimateFlow on their phone's home screen, from within the app itself.

---

## Design Decisions

### Placement: Floating button (primary) + Settings row (persistent fallback)

- A floating orange pill button in the bottom-right corner handles first-time installs. It appears automatically when installation is possible and disappears once dismissed or installed.
- A permanent "Install App" row in Settings handles reinstalls, new devices, and users who dismissed the floating button. It is always visible regardless of dismissal state.

### Platform behavior

| Platform | Floating button tap | Settings row tap |
|---|---|---|
| Android (Chrome) | Native browser install dialog | Same |
| iOS (Safari) | 4-step instruction modal | Same modal |
| Already installed (standalone) | Button hidden | Row still shown (for reinstall awareness) |
| Desktop | Button hidden (browser omnibar handles it) | Row still shown |

---

## Architecture

### `src/hooks/useInstallPrompt.ts`

Single source of truth for all install state and logic. Both the floating button and the Settings row import this hook.

**Responsibilities:**
- Listen for the `beforeinstallprompt` event (Android/Chrome). Store the deferred event.
- Detect iOS Safari: `navigator.userAgent` matches iPhone/iPad/iPod AND `window.MSStream` is absent (rules out IE), AND `navigator.standalone` is not already true.
- Detect standalone mode: `window.matchMedia('(display-mode: standalone)').matches` OR `navigator.standalone === true`.
- Detect dismissal: read `localStorage.getItem('pwa-install-dismissed')`.

**Returns:**
```ts
{
  canInstall: boolean        // true if Android prompt available or iOS Safari (and not standalone)
  isIOS: boolean             // true if iOS Safari (determines which UI to show)
  isStandalone: boolean      // true if already running as installed PWA
  isDismissed: boolean       // true if user dismissed the floating button
  trigger: () => Promise<void>  // Android: calls deferredPrompt.prompt(); iOS: no-op (caller shows modal)
  dismiss: () => void        // sets localStorage flag; hides floating button only
}
```

**Notes:**
- `trigger()` is only meaningful on Android. iOS callers should show the instruction modal themselves when `isIOS` is true.
- `dismiss()` only affects the floating button visibility. The Settings row ignores `isDismissed`.
- The hook cleans up the `beforeinstallprompt` listener on unmount.

---

### `src/components/ui/InstallPrompt.tsx`

The floating pill button and iOS instruction modal, combined in one component.

**Render conditions:** Only renders when `canInstall && !isDismissed && !isStandalone`.

**Button:** Fixed position, bottom-right, orange pill (`bg-orange-500`), matches existing button style. Label: "Install App" with a phone icon (Phosphor `DeviceMobile`). Includes a dismiss X button.

**On button tap:**
- If `isIOS`: open the instruction modal (local `useState`)
- If Android: call `trigger()`. After the promise resolves, the `beforeinstallprompt` event is consumed and `canInstall` becomes false — button disappears automatically.

**iOS instruction modal:** Uses the existing `Modal` component from `src/components/ui/Modal.tsx`. Content: 4 numbered steps with orange step indicators.

```
1. Tap "..." at the bottom of Safari to open the menu
2. Tap "Share" ⬆️
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right corner
```

Footer: "Got it" button (closes modal) + "Dismiss" text link (closes modal and calls `dismiss()`).

**Mounting:** Rendered inside the `RequireAuth` layout component, so it only appears on authenticated pages and is available across all routes.

---

### Settings page — Install App row

Added to the existing Settings page (`src/pages/SettingsPage.tsx`).

**Placement:** A new section or within an existing "App" section. Always visible — no `isDismissed` check.

**Behavior:** Same as the floating button's tap logic:
- `isIOS` → open the 4-step modal
- Android → call `trigger()`
- Already installed (`isStandalone`) → row is visible but shows "Already installed" as secondary text, button disabled

**The iOS modal content** is identical between the floating button and the Settings row. Extract it to `src/components/ui/IOSInstallModal.tsx` — a small component that accepts `open` and `onClose` props and renders the 4-step instructions inside the existing `Modal`. Both consumers import it directly.

---

## Data Flow

```
useInstallPrompt (hook)
  ├── InstallPrompt.tsx (floating button + iOS modal)
  │     └── Modal.tsx (existing)
  └── SettingsPage.tsx (install row)
        └── same iOS modal content
```

No global state store needed. The hook's `beforeinstallprompt` listener is local to each consumer, but since both components are mounted simultaneously, only one needs to capture the event — or the hook can be called in a parent and the result passed down. Simplest: let both components call the hook independently; the `beforeinstallprompt` event fires once and only the first listener captures it. To avoid this race, lift the hook to `RequireAuth` and pass the result down as props, or use React context.

**Recommended:** Wrap hook state in a small `InstallPromptContext` so it's captured once and shared. `RequireAuth` provides the context; `InstallPrompt` and `SettingsPage` consume it.

---

## Error Handling

- If `trigger()` is called but `deferredPrompt` is null (race condition or already consumed): no-op, log a warning. Do not show an error to the user.
- If `localStorage` is unavailable (private browsing edge case): `isDismissed` defaults to `false`. The button keeps showing, which is acceptable.

---

## What Is Not In Scope

- Tracking install analytics (could be added later via `appinstalled` event → log to `ai_usage_events` or a future `analytics_events` table)
- Showing the floating button on the public client view (`/e/:token`) — contractors install, not clients
- Android notification permission or push subscriptions
- Any change to the service worker or manifest (already shipped)
