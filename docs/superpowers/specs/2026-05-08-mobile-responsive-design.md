# Mobile-Responsive Design — EstimateFlow

**Date:** 2026-05-08  
**Status:** Approved for implementation

## Problem

Contractors use EstimateFlow on their phones on job sites — both to create estimates from scratch and to review/edit existing ones. The app currently has zero responsive breakpoints. Several components use hardcoded desktop widths (`min-w-[70rem]`, `grid-cols-3`) that make the app completely unusable on a phone.

## Decisions Made

| Question | Decision |
|---|---|
| Editor usage on mobile | Both creation and review (equally important) |
| Line item editor pattern | Card layout — collapsed by default, tap to expand all fields |
| Dashboard estimate list | Card list — client, job title, status badge, total |
| Dashboard stat cards | 2-column grid on mobile |
| Top navigation | Logo + avatar only on mobile (hide nav links) |
| Breakpoint strategy | Single `sm:` breakpoint (640px) — below = mobile, above = desktop |

## Approach

**Tailwind responsive redesign (Approach B):** Add `sm:` breakpoint prefixes to existing components. No separate mobile component files — one component per concept, CSS-controlled layout switching. Desktop layouts remain untouched above 640px.

---

## Component-by-Component Design

### 1. TopNav (`src/components/layout/TopNav.tsx`)

**Mobile (< 640px):** Logo on the left, avatar/profile button on the right. All other nav links hidden (`hidden sm:flex`).  
**Desktop (≥ 640px):** Unchanged.

### 2. DashboardPage (`src/pages/DashboardPage.tsx`)

#### Stat cards
**Mobile:** `grid-cols-2` — first two cards side by side, third card spans full width (`col-span-2`) to show total pipeline value prominently.  
**Desktop:** `sm:grid-cols-3` — unchanged.

#### Estimate list
**Mobile:** Card list replaces the table entirely. Each card shows:
- Client name (bold, primary)
- Job title (secondary text)
- Est. number + relative date (meta text)
- Status badge (right side)
- Total amount (right side, bold)
- Chevron `›` indicating tappable row

Cards use `block sm:hidden`. The existing `<table>` uses `hidden sm:table`.

**Desktop:** Existing 7-column table — unchanged.

#### Search + filters
**Mobile:** Full-width search input. Filter button icon-only (no label) to save space.  
**Desktop:** Unchanged.

### 3. EditorHeaderBar (`src/components/estimate/EditorHeaderBar.tsx`)

**Mobile:** Two rows.
- Row 1: Back button `←`, estimate title input (flex-1), Save indicator
- Row 2: Client dropdown (flex-1), Send button

**Desktop (≥ 640px):** Existing single-row layout — back, client dropdown, title, save indicator, send button.

### 4. EstimateSection + LineItemRow

**Files:** `src/components/estimate/EstimateSection.tsx`, `src/components/estimate/LineItemRow.tsx`

This is the most significant change.

#### Section header
No change needed — already a simple flex row.

#### Column header row (EstimateSection)
**Mobile:** Hidden (`hidden sm:grid`) — cards have their own inline labels.  
**Desktop:** Existing `min-w-[70rem]` 9-column grid — unchanged, but wrapped in `overflow-x-auto` as a safety net.

#### Line item (LineItemRow)
**Mobile (`block sm:hidden`):** Collapsed card showing:
```
[drag] Description name          $total  ›
```
Tapping the card expands it inline (controlled by local `isExpanded` state):
```
[drag] Description name          $total  ∨

  Description  [________________]
  Qty          [______]
  Unit Price   [______]
  Markup       [______]
  Total              $2,125.00
  [📷 Add photo]  [Optional toggle]  [🗑]
```
Fields are standard `<input>` elements, same bindings as the desktop grid cells.  
Drag handle remains functional in both states.

**Desktop (`hidden sm:grid`):** Existing 9-column grid — unchanged.

> **Implementation note:** `isExpanded` is local component state (`useState(false)`). New line items added on mobile start expanded. No store changes needed.

### 5. StickyTotalsBar (`src/components/estimate/StickyTotalsBar.tsx`)

**Mobile:** Tighter padding (`px-3 gap-3`), font sizes reduced one step, height stays at `h-14`. Items remain `justify-end`. On very narrow screens (< 360px) items won't overflow because totals are short strings.  
**Desktop:** Unchanged (`px-6 gap-6`).

### 6. WizardStep3Capture (`src/components/wizard/WizardStep3Capture.tsx`)

Photo thumbnail grid: `grid-cols-2 sm:grid-cols-3`. Two columns on mobile is comfortable; three is the current desktop behavior.

### 7. Global padding

All page-level containers currently use `px-6`. Change to `px-4 sm:px-6` so content doesn't butt up against screen edges on narrow phones.

---

## What Doesn't Change

- Auth, Onboarding, Settings pages — already mobile-safe (centered cards with proper padding)
- Wizard steps 1, 2, 4, 5 — already use `max-w-lg mx-auto` with `px-4`
- All modals — already `max-w-sm w-full`
- All banners — already full-width flex

---

## Touch Interaction Notes

- Minimum tap target: 44px height on all interactive rows and buttons (Tailwind `min-h-[44px]`)
- Line item card collapsed height: 44px — one `py-2.5` row
- Drag handles remain visible and functional on mobile (dnd-kit supports touch)
- Row action menus (3-dot) on dashboard cards use `onClick`, not hover — already correct

---

## Breakpoints Reference

| Prefix | Min-width | Used for |
|---|---|---|
| (none) | 0px | Mobile layout |
| `sm:` | 640px | Desktop layout |

No `md:`, `lg:`, or `xl:` prefixes needed for this pass.

---

## Files to Modify

| File | Change |
|---|---|
| `src/components/layout/TopNav.tsx` | Hide nav links on mobile |
| `src/pages/DashboardPage.tsx` | Card list + 2-col stats on mobile |
| `src/components/estimate/EditorHeaderBar.tsx` | Two-row layout on mobile |
| `src/components/estimate/EstimateSection.tsx` | Hide column header on mobile; add overflow-x-auto wrapper |
| `src/components/estimate/LineItemRow.tsx` | Add collapsed/expanded card on mobile |
| `src/components/estimate/StickyTotalsBar.tsx` | Tighter padding on mobile |
| `src/components/wizard/WizardStep3Capture.tsx` | 2-col photo grid on mobile |
| `src/pages/EstimateEditPage.tsx` | `px-4 sm:px-6` padding |
| `src/pages/DashboardPage.tsx` | `px-4 sm:px-6` padding |

---

## Verification

Test at these viewport widths in browser DevTools:
- 375px (iPhone SE / standard phone)
- 320px (very small phones — stress test)
- 640px (breakpoint boundary)
- 1024px (desktop — regression check)

Checklist:
- [ ] Dashboard card list renders at 375px, table renders at 640px+
- [ ] Stat cards are 2-column at 375px, 3-column at 640px+
- [ ] Line item cards collapse/expand correctly on mobile
- [ ] All fields in expanded card are editable with correct store bindings
- [ ] New line items added on mobile start expanded
- [ ] Drag-to-reorder works on mobile (touch events)
- [ ] Editor header bar is two-row at 375px, single-row at 640px+
- [ ] Send button is always visible and tappable
- [ ] StickyTotalsBar doesn't overlap content (pb-14 on scroll container)
- [ ] No horizontal overflow at 375px (check with DevTools overflow inspector)
- [ ] Wizard step 3 photo grid is 2-column at 375px
- [ ] Desktop layouts unchanged at 1024px
