# UI Modernization Design

**Date:** 2026-05-08  
**Status:** Approved  
**Scope:** All pages — Dashboard, Estimate Editor, Wizard, Auth & Onboarding

---

## Summary

Replace the current generic slate/blue UI with a warm, professional aesthetic and swap all emoji/unicode icons for Phosphor Icons. The result should feel like a polished SaaS tool built for contractors — approachable, trustworthy, and modern without being cold or tech-bro.

---

## Design Direction

**Personality:** Warm & Professional — similar to Gusto or FreshBooks. Warm neutrals, orange accent, card-based layouts with stat summaries.

**Key visual changes:**
- Color palette shifts from `slate` → `stone` (neutrals) and `blue` → `orange` (primary accent)
- Primary action buttons use an orange gradient (`from-orange-600 to-orange-500`) with a subtle box shadow
- Logo mark: orange gradient rounded square with a document Phosphor icon — appears in TopNav
- Avatar: orange gradient circle (matches brand accent)
- Status badges become pill-shaped with rounded-full
- Table rows: white/stone-50 alternating, more generous padding
- Stat summary cards added to Dashboard (Drafts / Sent / Approved)
- Total in StickyTotalsBar displayed in orange to draw the eye

---

## Icon Library

**Package:** `@phosphor-icons/react`  
**Style:** Fill (solid, weighted) — gives icons tactile presence without being heavy  
**Size conventions:** 14px inline, 16px action buttons, 18px nav, 20px empty states

### Replacement map

| Current | Phosphor replacement | Component |
|---|---|---|
| `≡` drag handle | `<DotsSixVertical />` | `DragHandle.tsx` |
| `⋮` actions menu | `<DotsThreeVertical />` | `LineItemActions.tsx`, `DashboardPage.tsx` |
| `🔍` search | `<MagnifyingGlass />` | `DashboardPage.tsx`, `WizardStep1Client.tsx`, `ClientDropdown.tsx` |
| `✨` AI badge | `<Sparkle />` | `AISuggestedBadge.tsx` |
| `✓` saved | `<CheckCircle />` | `SaveIndicator.tsx` |
| `×` / `✕` close/remove | `<X />` | `Modal.tsx`, `AttachmentThumbnails.tsx` |
| `+` add item/section | `<Plus />` | `AddLineItemButton.tsx`, `AddSectionButton.tsx` |
| `→` send/continue | `<PaperPlaneTilt />` (send), `<ArrowRight />` (navigation) | `EditorHeaderBar.tsx`, `WizardShell.tsx` |
| `↕` `↑` `↓` sort | `<ArrowsDownUp />`, `<ArrowUp />`, `<ArrowDown />` | `DashboardPage.tsx` |
| Camera (attach photo) | `<Camera />` | `AttachPhotoButton.tsx` |
| Back arrow | `<ArrowLeft />` | `WizardShell.tsx`, `EditorHeaderBar.tsx` |
| User avatar area | `<User />` | `TopNav.tsx` (fallback) |
| Settings | `<Gear />` | `TopNav.tsx` |
| Delete | `<Trash />` | Modals, section header |
| Document/estimate | `<FileText />` | `TopNav.tsx` logo mark |
| Filter | `<Funnel />` | `DashboardPage.tsx` |
| Checkmark (approved) | `<Check />` | Status badges |

---

## Color System

Switch Tailwind color classes throughout the codebase:

| Old | New | Usage |
|---|---|---|
| `slate-50` | `stone-50` | Page backgrounds |
| `slate-100` | `stone-100` | Table header, nav tints |
| `slate-200` | `stone-200` | Borders |
| `slate-400` | `stone-400` | Muted text, placeholders |
| `slate-500` | `stone-500` | Secondary text |
| `slate-700` | `stone-700` | Body text |
| `slate-900` | `stone-900` | Headings |
| `blue-600` | `orange-600` | Primary buttons, links, focus rings |
| `blue-100/700` (sent badge) | `green-100/700` | Sent status badge |

**New additions:**
- `bg-gradient-to-br from-orange-600 to-orange-500` — primary button, logo mark
- `shadow-[0_1px_3px_rgba(234,88,12,0.3)]` — orange button glow
- `text-orange-600` — total amount in StickyTotalsBar, estimate numbers in table

---

## Component Changes by Page

### Global — `TopNav.tsx`
- Add gradient logo mark (orange rounded square + `<FileText />` icon in white)
- Replace settings text/emoji with `<Gear />` icon button
- Avatar: orange gradient circle with initials (already present, enhance styling)

### Dashboard — `DashboardPage.tsx`
- Add 3 stat cards above the table: **Drafts**, **Sent**, **Approved**
  - Counts derived from existing estimates query (filter by status)
  - Draft card: white with stone border; Sent: amber-tinted; Approved: green-tinted
- Replace `🔍` in search input with `<MagnifyingGlass />`
- Replace `↕↑↓` sort icons with Phosphor arrow icons
- Replace `⋮` row actions with `<DotsThreeVertical />`
- Add `<Funnel />` icon to filter button
- Update `StatusBadge` to pill shape (`rounded-full`)
- Update "New Estimate" button to orange gradient style
- Swap slate palette to stone throughout

### Estimate Editor
**`EditorHeaderBar.tsx`**
- Back button: add `<ArrowLeft />` icon
- Client selector: add `<User />` icon prefix + `<CaretDown />` suffix
- Send button: replace `→` with `<PaperPlaneTilt />`, orange gradient style
- Save indicator: replace `✓` text with `<CheckCircle />` icon

**`DragHandle.tsx`**
- Replace `≡` with `<DotsSixVertical weight="fill" />`

**`LineItemActions.tsx`**
- Replace `⋮` with `<DotsThreeVertical />`

**`SectionHeader.tsx`**
- Replace delete trigger character with `<DotsThreeVertical />` menu icon
- Replace delete option with `<Trash />` icon

**`AddLineItemButton.tsx`**
- Replace `+` with `<Plus />` icon, update color to `text-orange-600`

**`AddSectionButton.tsx`**
- Replace `+` with `<Plus />` icon, orange gradient button style

**`AISuggestedBadge.tsx`**
- Replace `✨` with `<Sparkle weight="fill" />` in purple

**`SaveIndicator.tsx`**
- Replace `✓` with `<CheckCircle weight="fill" />` (green, saved state)
- Loading: `<CircleNotch />` with spin animation

**`AttachPhotoButton.tsx`**
- Replace camera emoji with `<Camera />`

**`AttachmentThumbnails.tsx`**
- Replace `✕` remove button with `<X weight="bold" />`

**`StickyTotalsBar.tsx`**
- Total amount: `text-orange-600 font-extrabold text-xl`
- Dividers: vertical `border-r border-stone-200` lines between sections

**`Modal.tsx`**
- Replace `×` close with `<X />` icon button

**`OfflineBanner.tsx`** / **`ReadOnlyBanner.tsx`**
- Add relevant Phosphor icons (`<WifiSlash />`, `<Lock />`)

### Wizard — `WizardShell.tsx` + steps
- Back button: `<ArrowLeft />`
- Continue/next button: `<ArrowRight />`, orange gradient
- Progress bar: use `bg-orange-500` active fill (already amber on step 5 — keep)
- **`WizardStep1Client.tsx`**: Replace `🔍` with `<MagnifyingGlass />`; remove button on inline form with `<X />`
- **`WizardStep3Capture.tsx`**: Replace camera emoji with `<Camera />`; thumbnail remove with `<X />`

### Auth — `AuthPage.tsx`
- Add gradient logo mark above the Supabase Auth UI component
- Update surrounding card styling to stone palette

### Onboarding — `OnboardingPage.tsx`
- Add gradient logo mark
- Update card and button styling to match warm palette

---

## New Feature: Dashboard Stat Cards

Three summary cards above the estimates table, derived from the existing estimates data already fetched in `DashboardPage.tsx`:

```
Drafts   |  Sent   |  Approved
  3      |   12    |    7
In prog  | Awaiting| This month
```

- **Data source:** filter the existing `estimates` array already in component state — no new query needed
- **Counts:** `status === 'draft'`, `status === 'sent'`, `status === 'approved'`
- **"This month" label** for Approved uses current month filter on `updated_at`

---

## Verification

1. Run `npm run lint && npm run type-check` — no errors
2. Run dev server and visually check:
   - Dashboard: stat cards show correct counts; all emoji replaced; orange accent throughout
   - Estimate Editor: drag handles, AI badge, save indicator, send button all use Phosphor icons
   - Wizard: all steps have proper icons, orange CTA buttons
   - Auth & Onboarding: logo mark visible, warm palette
3. Check no `@ts-ignore` or `any` introduced from Phosphor imports
4. Confirm Phosphor icons are tree-shaken (only imported icons ship) — verified by checking bundle size in `npm run build` output
