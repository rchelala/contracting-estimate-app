# Contracting Category Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a category selector as Step 0 of the estimate wizard so the AI uses trade-specific prompts for both Q&A question generation and estimate drafting.

**Architecture:** A shared `src/constants/categoryConfig.ts` (no React imports) defines 10 contractor categories, each with two prompt context strings. Both AI endpoints (`wizard-questions`, `draft-estimate`) accept an optional `category` field and inject the matching context into the Anthropic prompt. The wizard gains a new Step 0 (`WizardStep0Category`) before the client step; category is stored in `wizardStore` only — not persisted to DB.

**Tech Stack:** React 18, TypeScript strict, Zustand, Phosphor Icons (`@phosphor-icons/react`), Vercel serverless functions, Anthropic API, Playwright for e2e tests.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/constants/categoryConfig.ts` | Create | CategoryId type, prompt configs, CATEGORY_PROMPT_MAP |
| `src/components/wizard/WizardStep0Category.tsx` | Create | Icon grid UI, category selection |
| `src/stores/wizardStore.ts` | Modify | Add step `0` to WizardStep, add `category` field + `setCategory` |
| `src/pages/EstimateWizardPage.tsx` | Modify | Route step 0, fix loading guard |
| `src/components/wizard/WizardShell.tsx` | Modify | Default totalSteps 5 → 6 |
| `src/components/wizard/WizardStep1Client.tsx` | Modify | Subtitle "Step 1 of 6", onBack to step 0 |
| `src/components/wizard/WizardStep2Location.tsx` | Modify | Subtitle "Step 2 of 6" |
| `src/components/wizard/WizardStep3Capture.tsx` | Modify | Subtitle "Step 3 of 6" |
| `src/components/wizard/WizardStep4Describe.tsx` | Modify | Subtitle "Step 4 of 6" |
| `src/components/wizard/WizardStep5QA.tsx` | Modify | Subtitle "Step 5 of 6" |
| `src/services/wizard.ts` | Modify | Pass `category` to both API calls |
| `src/components/wizard/WizardGenerating.tsx` | Modify | Read category from store, pass to draftEstimateFromWizard |
| `api/ai/wizard-questions.ts` | Modify | Accept `category`, inject prompt context |
| `api/ai/draft-estimate.ts` | Modify | Accept `category`, inject into buildPrompt |
| `tests/category-wizard.spec.ts` | Create | Playwright: all 10 categories through wizard |

---

## Task 1: Create category config

**Files:**
- Create: `src/constants/categoryConfig.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/constants/categoryConfig.ts

export type CategoryId =
  | 'creative_services'
  | 'information_technology'
  | 'business_finance'
  | 'consulting'
  | 'specialized_trades'
  | 'general_contracting'
  | 'education_training'
  | 'logistics_delivery'
  | 'real_estate'
  | 'wellness_personal_care'

export interface CategoryPromptConfig {
  id: CategoryId
  label: string
  subtitle: string
  questionsPromptContext: string
  draftPromptContext: string
}

export const CATEGORY_PROMPT_CONFIGS: CategoryPromptConfig[] = [
  {
    id: 'creative_services',
    label: 'Creative Services',
    subtitle: 'Designers, writers, videographers',
    questionsPromptContext:
      'Ask about deliverables (logo, video, copy, photos), format and specifications, number of revision rounds, timeline, existing brand guidelines, and intended platform or use.',
    draftPromptContext:
      'Use sections like Creative Brief & Strategy, Design or Production, Revisions & Feedback, and Licensing & Usage Rights. Line items use units like "hr", "project", "round", "asset". No material markup. Professional service rates typically $50–$200/hr.',
  },
  {
    id: 'information_technology',
    label: 'Information Technology',
    subtitle: 'Developers, cybersecurity, UX/UI',
    questionsPromptContext:
      'Ask about project type (new build vs maintenance), technology stack preferences, team or user count, access and environment requirements, security or compliance needs, and timeline.',
    draftPromptContext:
      'Use sections like Discovery & Architecture, Development, Testing & QA, and Deployment & Support. Line items use units like "hr", "sprint", "day", "license". No material markup. Rates typically $75–$250/hr.',
  },
  {
    id: 'business_finance',
    label: 'Business & Finance',
    subtitle: 'Accountants, bookkeepers, advisors',
    questionsPromptContext:
      'Ask about business entity type (LLC, S-Corp, sole proprietor), fiscal year, approximate number of accounts and transactions per month, filing type needed, and whether books are currently up to date.',
    draftPromptContext:
      'Use sections like Assessment & Setup, Monthly Bookkeeping, Filings & Compliance, and Advisory Services. Line items use units like "hr", "month", "return", "account". No material markup. Rates typically $50–$350/hr depending on specialization.',
  },
  {
    id: 'consulting',
    label: 'Consulting',
    subtitle: 'Management, marketing, HR consultants',
    questionsPromptContext:
      'Ask about the specific business challenge being addressed, current team size, desired outcomes and success metrics, expected project timeline, and whether implementation support beyond recommendations is needed.',
    draftPromptContext:
      'Use sections like Discovery & Assessment, Strategy & Planning, Implementation Support, and Final Report & Recommendations. Line items use units like "hr", "day", "project", "deliverable". No material markup. Rates typically $75–$300/hr.',
  },
  {
    id: 'specialized_trades',
    label: 'Specialized Trades',
    subtitle: 'Plumbers, electricians, HVAC, masons',
    questionsPromptContext:
      'Ask about the specific trade type, whether the work is new installation or repair, materials preference (standard or premium), site access conditions, permit requirements, and desired timeline.',
    draftPromptContext:
      'Use sections like Labor, Materials, Equipment & Tool Rental, Permits & Inspections, and Cleanup & Disposal. Line items use units like "hr", "each", "linear ft", "sq ft", "day". Apply material markup of 15–30%. Labor rates typically $60–$150/hr.',
  },
  {
    id: 'general_contracting',
    label: 'General Contracting',
    subtitle: 'Residential/commercial project managers',
    questionsPromptContext:
      'Ask about project scope (new construction vs renovation), total square footage, site conditions and access, which subcontractors are required (electrical, plumbing, HVAC), permit status, and project timeline.',
    draftPromptContext:
      'Use sections like Site Preparation, Framing & Structure, Mechanical/Electrical/Plumbing, Finishes, and Project Management & Overhead. Line items use units like "sq ft", "hr", "day", "allowance". Apply material markup of 10–20%. General contractor overhead typically 15–25% of project cost.',
  },
  {
    id: 'education_training',
    label: 'Education & Training',
    subtitle: 'Tutors, coaches, corporate trainers',
    questionsPromptContext:
      'Ask about learning objectives, number of participants, session length and frequency, in-person or remote delivery, whether curriculum development is needed, and any assessments or printed materials required.',
    draftPromptContext:
      'Use sections like Curriculum Development, Instruction & Sessions, Materials & Resources, and Assessment & Follow-up. Line items use units like "hr", "session", "participant", "day". No material markup. Rates typically $40–$200/hr or $150–$2,000/day for corporate engagements.',
  },
  {
    id: 'logistics_delivery',
    label: 'Logistics & Delivery',
    subtitle: 'Couriers, freight, rideshare operators',
    questionsPromptContext:
      'Ask about pickup and delivery locations, cargo type and approximate weight or dimensions, required timeline, any special handling requirements (fragile, temperature-sensitive), and whether this is a one-time or recurring engagement.',
    draftPromptContext:
      'Use sections like Base Delivery Fee, Distance & Fuel Surcharge, Special Handling, and Insurance & Liability. Line items use units like "mile", "item", "pallet", "hr", "trip". No material markup. Base rates typically $25–$200 per trip plus per-mile charges.',
  },
  {
    id: 'real_estate',
    label: 'Real Estate',
    subtitle: 'Independent agents, property managers',
    questionsPromptContext:
      'Ask about property type (residential or commercial), transaction type (buy, sell, lease, or property management), property size and location, and specific scope of services needed.',
    draftPromptContext:
      'Use sections like Listing & Marketing, Showings & Negotiations, Transaction Coordination, and Property Management Services if applicable. Line items use units like "%", "month", "property", "hr". Commission-based pricing typically 2.5–6% of sale price; property management typically $100–$300/month per unit.',
  },
  {
    id: 'wellness_personal_care',
    label: 'Wellness & Personal Care',
    subtitle: 'Massage therapists, stylists, estheticians',
    questionsPromptContext:
      'Ask about the specific service type, session duration, number of sessions or package size, whether services are in-studio or mobile, and any specialty products or equipment needed.',
    draftPromptContext:
      'Use sections like Service Fee, Products & Supplies, Travel & Mobile Fee if applicable, and Package or Membership Discount. Line items use units like "session", "hr", "treatment", "visit". Apply product markup of 20–40%. Service rates typically $60–$200/hr depending on specialty.',
  },
]

export const CATEGORY_PROMPT_MAP: Record<CategoryId, CategoryPromptConfig> =
  Object.fromEntries(CATEGORY_PROMPT_CONFIGS.map((c) => [c.id, c])) as Record<
    CategoryId,
    CategoryPromptConfig
  >
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/constants/categoryConfig.ts && rtk git commit -m "feat: add category config with 10 contractor categories and prompt contexts"
```

---

## Task 2: Update wizardStore

**Files:**
- Modify: `src/stores/wizardStore.ts`

- [ ] **Step 1: Update the file**

Replace the entire file content:

```typescript
import { create } from 'zustand'
import type { CategoryId } from '../constants/categoryConfig'

export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 'generating'

export interface QAPair {
  question: string
  answer: string | null
}

export interface WizardState {
  step: WizardStep
  organizationId: string | null
  // Step 0
  category: CategoryId | null
  // Step 1
  clientId: string | null
  newClientName: string
  newClientEmail: string
  newClientPhone: string
  // Step 2
  zipCode: string
  // Step 3
  photoFiles: File[]
  videoFile: File | null
  // Step 4
  description: string
  // Step 5
  qaPairs: QAPair[]
  showAllMode: boolean
  currentQuestionIndex: number

  setStep: (step: WizardStep) => void
  setOrganizationId: (id: string) => void
  setCategory: (category: CategoryId) => void
  setClientId: (id: string | null) => void
  setNewClientFields: (fields: { name?: string; email?: string; phone?: string }) => void
  setZipCode: (zip: string) => void
  addPhotoFile: (file: File) => void
  removePhotoFile: (index: number) => void
  setVideoFile: (file: File | null) => void
  setDescription: (desc: string) => void
  setQAPairs: (pairs: QAPair[]) => void
  answerQuestion: (index: number, answer: string) => void
  setCurrentQuestionIndex: (i: number) => void
  setShowAllMode: (val: boolean) => void
  reset: () => void
}

const initialState = {
  step: 0 as WizardStep,
  organizationId: null,
  category: null,
  clientId: null,
  newClientName: '',
  newClientEmail: '',
  newClientPhone: '',
  zipCode: '',
  photoFiles: [] as File[],
  videoFile: null,
  description: '',
  qaPairs: [] as QAPair[],
  showAllMode: false,
  currentQuestionIndex: 0,
}

export const useWizardStore = create<WizardState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setOrganizationId: (id) => set({ organizationId: id }),
  setCategory: (category) => set({ category }),
  setClientId: (id) => set({ clientId: id }),
  setNewClientFields: (fields) => set((s) => ({
    newClientName: fields.name ?? s.newClientName,
    newClientEmail: fields.email ?? s.newClientEmail,
    newClientPhone: fields.phone ?? s.newClientPhone,
  })),
  setZipCode: (zipCode) => set({ zipCode }),
  addPhotoFile: (file) => set((s) => ({
    photoFiles: s.photoFiles.length < 10 ? [...s.photoFiles, file] : s.photoFiles,
  })),
  removePhotoFile: (index) => set((s) => ({
    photoFiles: s.photoFiles.filter((_, i) => i !== index),
  })),
  setVideoFile: (videoFile) => set({ videoFile }),
  setDescription: (description) => set({ description }),
  setQAPairs: (qaPairs) => set({ qaPairs, currentQuestionIndex: 0 }),
  answerQuestion: (index, answer) => set((s) => ({
    qaPairs: s.qaPairs.map((p, i) => i === index ? { ...p, answer } : p),
  })),
  setCurrentQuestionIndex: (currentQuestionIndex) => set({ currentQuestionIndex }),
  setShowAllMode: (showAllMode) => set({ showAllMode }),
  reset: () => set(initialState),
}))
```

- [ ] **Step 2: Run type-check**

```bash
rtk tsc --noEmit
```

Expected: no errors related to wizardStore.

- [ ] **Step 3: Commit**

```bash
rtk git add src/stores/wizardStore.ts && rtk git commit -m "feat: add category field and step 0 to wizardStore"
```

---

## Task 3: Create WizardStep0Category component

**Files:**
- Create: `src/components/wizard/WizardStep0Category.tsx`

- [ ] **Step 1: Create the file**

```typescript
import {
  PaintBrush, Code, Calculator, ChartLine, Wrench,
  Buildings, GraduationCap, Truck, House, Heart,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useWizardStore } from '../../stores/wizardStore'
import { CATEGORY_PROMPT_CONFIGS } from '../../constants/categoryConfig'
import type { CategoryId } from '../../constants/categoryConfig'
import { WizardShell } from './WizardShell'

const CATEGORY_ICONS: Record<CategoryId, Icon> = {
  creative_services: PaintBrush,
  information_technology: Code,
  business_finance: Calculator,
  consulting: ChartLine,
  specialized_trades: Wrench,
  general_contracting: Buildings,
  education_training: GraduationCap,
  logistics_delivery: Truck,
  real_estate: House,
  wellness_personal_care: Heart,
}

export function WizardStep0Category() {
  const { category, setCategory, setStep } = useWizardStore()

  return (
    <WizardShell
      step={0}
      totalSteps={6}
      title="What type of work?"
      subtitle="Select your contracting category"
    >
      <div className="grid grid-cols-2 gap-2 mb-6">
        {CATEGORY_PROMPT_CONFIGS.map((cat) => {
          const IconComponent = CATEGORY_ICONS[cat.id]
          const isSelected = category === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500'
                  : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <IconComponent
                size={24}
                weight="bold"
                className={isSelected ? 'text-orange-500' : 'text-stone-500'}
                aria-hidden="true"
              />
              <div>
                <div className={`text-sm font-semibold leading-tight ${isSelected ? 'text-orange-700' : 'text-stone-900'}`}>
                  {cat.label}
                </div>
                <div className="text-xs text-stone-500 mt-0.5 leading-snug">{cat.subtitle}</div>
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => setStep(1)}
        disabled={category === null}
        className="w-full bg-linear-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-40 shadow-sm"
      >
        Continue
      </button>
    </WizardShell>
  )
}
```

- [ ] **Step 2: Run type-check**

```bash
rtk tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/wizard/WizardStep0Category.tsx && rtk git commit -m "feat: add WizardStep0Category icon grid component"
```

---

## Task 4: Update EstimateWizardPage and WizardShell

**Files:**
- Modify: `src/pages/EstimateWizardPage.tsx`
- Modify: `src/components/wizard/WizardShell.tsx`

- [ ] **Step 1: Update EstimateWizardPage.tsx**

Replace the entire file:

```typescript
// src/pages/EstimateWizardPage.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizardStore } from '../stores/wizardStore'
import { supabase } from '../lib/supabase'
import { WizardStep0Category } from '../components/wizard/WizardStep0Category'
import { WizardStep1Client } from '../components/wizard/WizardStep1Client'
import { WizardStep2Location } from '../components/wizard/WizardStep2Location'
import { WizardStep3Capture } from '../components/wizard/WizardStep3Capture'
import { WizardStep4Describe } from '../components/wizard/WizardStep4Describe'
import { WizardStep5QA } from '../components/wizard/WizardStep5QA'
import { WizardGenerating } from '../components/wizard/WizardGenerating'

export default function EstimateWizardPage() {
  const { step, reset, setOrganizationId, organizationId } = useWizardStore()
  const navigate = useNavigate()

  useEffect(() => {
    reset()
    // Resolve organization ID once at mount
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return navigate('/auth')
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', data.session.user.id)
        .single()
      if (membership) setOrganizationId(membership.organization_id)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!organizationId && step !== 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (step === 0) return <WizardStep0Category />
  if (step === 1) return <WizardStep1Client />
  if (step === 2) return <WizardStep2Location />
  if (step === 3) return <WizardStep3Capture />
  if (step === 4) return <WizardStep4Describe />
  if (step === 5) return <WizardStep5QA />
  if (step === 'generating') return <WizardGenerating />

  return null
}
```

- [ ] **Step 2: Update WizardShell.tsx default totalSteps**

In `src/components/wizard/WizardShell.tsx`, change the default parameter from `5` to `6`:

```typescript
// Change this line:
  totalSteps = 5,
// To:
  totalSteps = 6,
```

- [ ] **Step 3: Run type-check**

```bash
rtk tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
rtk git add src/pages/EstimateWizardPage.tsx src/components/wizard/WizardShell.tsx && rtk git commit -m "feat: insert category step 0 into wizard flow"
```

---

## Task 5: Update existing wizard step subtitles

The subtitle in each step currently reads "Step X of 5". Update to "Step X of 6" and add a Back button to Step 1 pointing to step 0.

**Files:**
- Modify: `src/components/wizard/WizardStep1Client.tsx`
- Modify: `src/components/wizard/WizardStep2Location.tsx`
- Modify: `src/components/wizard/WizardStep3Capture.tsx`
- Modify: `src/components/wizard/WizardStep4Describe.tsx`
- Modify: `src/components/wizard/WizardStep5QA.tsx`

- [ ] **Step 1: Update WizardStep1Client.tsx**

In `WizardStep1Client.tsx`, update the `WizardShell` props:

```typescript
// Change:
      step={1}
      title="Who's the client?"
      subtitle="Step 1 of 5"
      onSkip={() => setStep(2)}
// To:
      step={1}
      title="Who's the client?"
      subtitle="Step 1 of 6"
      onBack={() => setStep(0)}
      onSkip={() => setStep(2)}
```

- [ ] **Step 2: Update WizardStep2Location.tsx**

Find the `WizardShell` subtitle prop and update it from `"Step 2 of 5"` to `"Step 2 of 6"`.

- [ ] **Step 3: Update WizardStep3Capture.tsx**

Find the `WizardShell` subtitle prop and update it from `"Step 3 of 5"` to `"Step 3 of 6"`.

- [ ] **Step 4: Update WizardStep4Describe.tsx**

Find the `WizardShell` subtitle prop and update it from `"Step 4 of 5"` to `"Step 4 of 6"`.

- [ ] **Step 5: Update WizardStep5QA.tsx**

Find the `WizardShell` subtitle prop and update it from `"Step 5 of 5"` to `"Step 5 of 6"`.

- [ ] **Step 6: Run type-check and lint**

```bash
rtk tsc --noEmit && rtk lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
rtk git add src/components/wizard/WizardStep1Client.tsx src/components/wizard/WizardStep2Location.tsx src/components/wizard/WizardStep3Capture.tsx src/components/wizard/WizardStep4Describe.tsx src/components/wizard/WizardStep5QA.tsx && rtk git commit -m "fix: update wizard step subtitles to 'of 6' and add back to Step 1"
```

---

## Task 6: Pass category through wizard services

**Files:**
- Modify: `src/services/wizard.ts`
- Modify: `src/components/wizard/WizardGenerating.tsx`

- [ ] **Step 1: Update wizard.ts**

Replace the entire file:

```typescript
import { supabase } from '../lib/supabase'
import type { CategoryId } from '../constants/categoryConfig'

export interface WizardDraftInput {
  estimateId: string
  description: string
  zipCode?: string
  qaPairs: { question: string; answer: string | null }[]
  attachmentIds: string[]
  category?: CategoryId
}

export async function fetchWizardQuestions(input: {
  description: string
  photoCount: number
  zipCode?: string
  category?: CategoryId
}): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch('/api/ai/wizard-questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      description: input.description,
      photo_count: input.photoCount,
      zip_code: input.zipCode || undefined,
      category: input.category || undefined,
    }),
  })

  if (!response.ok) throw new Error('Failed to fetch questions')
  const data = await response.json() as { questions: string[] }
  return data.questions
}

export async function draftEstimateFromWizard(input: WizardDraftInput): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch('/api/ai/draft-estimate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      estimate_id: input.estimateId,
      description: input.description,
      zip_code: input.zipCode || undefined,
      qa_pairs: input.qaPairs,
      attachment_ids: input.attachmentIds,
      category: input.category || undefined,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
    throw new Error(err.error ?? 'Failed to draft estimate')
  }
}
```

- [ ] **Step 2: Update WizardGenerating.tsx**

In the destructuring at the top of `WizardGenerating`, add `category`:

```typescript
// Change:
  const {
    organizationId, clientId, newClientName, newClientEmail, newClientPhone,
    zipCode, photoFiles, videoFile, description, qaPairs, reset,
  } = useWizardStore()
// To:
  const {
    organizationId, clientId, newClientName, newClientEmail, newClientPhone,
    zipCode, photoFiles, videoFile, description, qaPairs, category, reset,
  } = useWizardStore()
```

Then update the `draftEstimateFromWizard` call to pass category:

```typescript
// Change:
      await draftEstimateFromWizard({
        estimateId: estimate.id,
        description,
        ...(zipCode ? { zipCode } : {}),
        qaPairs,
        attachmentIds,
      })
// To:
      await draftEstimateFromWizard({
        estimateId: estimate.id,
        description,
        ...(zipCode ? { zipCode } : {}),
        qaPairs,
        attachmentIds,
        ...(category ? { category } : {}),
      })
```

- [ ] **Step 3: Run type-check**

```bash
rtk tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
rtk git add src/services/wizard.ts src/components/wizard/WizardGenerating.tsx && rtk git commit -m "feat: thread category through wizard service calls"
```

---

## Task 7: Update wizard-questions API endpoint

**Files:**
- Modify: `api/ai/wizard-questions.ts`

- [ ] **Step 1: Update the file**

Replace the entire file:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { createAuthSupabase } from '../lib/supabase.js'
import { CATEGORY_PROMPT_MAP } from '../../src/constants/categoryConfig.js'
import type { CategoryId } from '../../src/constants/categoryConfig.js'

interface WizardQuestionsRequest {
  description: string
  photo_count: number
  zip_code?: string
  category?: CategoryId
}

interface JsonResponseWriter {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body: string): void
}

type RawRequest = { body?: unknown; headers: Record<string, string | string[] | undefined>; method?: string }

function jsonResponse(res: JsonResponseWriter, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: RawRequest, res: JsonResponseWriter) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed' })
  }

  const authorization = (req.headers.authorization as string) ?? ''
  const supabase = createAuthSupabase(authorization)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonResponse(res, 401, { error: 'Authentication required' })

  const body = req.body as WizardQuestionsRequest
  const { description, photo_count, zip_code, category } = body

  if (typeof description !== 'string' || !description.trim()) {
    return jsonResponse(res, 400, { error: 'description is required' })
  }

  const locationContext = zip_code ? ` The job is in zip code ${zip_code}.` : ''
  const photoContext = photo_count > 0
    ? ` The contractor has provided ${photo_count} photo(s) of the job site.`
    : ''

  const categoryConfig = category ? CATEGORY_PROMPT_MAP[category] : null
  const categoryContext = categoryConfig
    ? `\n\nContractor category: ${categoryConfig.label}. ${categoryConfig.questionsPromptContext}`
    : ''

  const prompt = `You are an experienced contractor reviewing a new job inquiry. Based on the job description below, generate 3 to 5 focused follow-up questions that will help you scope the work and price it accurately. Questions should be short, practical, and directly relevant to the work described.${categoryContext}

Job description: "${description}"${locationContext}${photoContext}

Return ONLY a JSON array of question strings, no explanation. Example:
["Question 1?", "Question 2?", "Question 3?"]`

  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    })

    const first = message.content[0]
    const text = first?.type === 'text' ? first.text.trim() : '[]'
    const match = text.match(/\[[\s\S]*\]/)
    const questions: string[] = match ? JSON.parse(match[0]) : []

    return jsonResponse(res, 200, { questions })
  } catch (err) {
    console.error('wizard-questions error:', err)
    return jsonResponse(res, 502, { error: 'Failed to generate questions' })
  }
}
```

- [ ] **Step 2: Run type-check**

```bash
rtk tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
rtk git add api/ai/wizard-questions.ts && rtk git commit -m "feat: inject category prompt context into wizard-questions AI prompt"
```

---

## Task 8: Update draft-estimate API endpoint

**Files:**
- Modify: `api/ai/draft-estimate.ts`

- [ ] **Step 1: Add import at the top of the file**

After the existing imports at the top of `api/ai/draft-estimate.ts`, add:

```typescript
import { CATEGORY_PROMPT_MAP } from '../../src/constants/categoryConfig.js'
import type { CategoryId } from '../../src/constants/categoryConfig.js'
```

- [ ] **Step 2: Add category to AIDraftRequestBody interface**

```typescript
// Change:
interface AIDraftRequestBody {
  estimate_id: string
  description: string
  zip_code?: string
  qa_pairs?: { question: string; answer: string | null }[]
  attachment_ids?: string[]
}
// To:
interface AIDraftRequestBody {
  estimate_id: string
  description: string
  zip_code?: string
  qa_pairs?: { question: string; answer: string | null }[]
  attachment_ids?: string[]
  category?: CategoryId
}
```

- [ ] **Step 3: Update buildPrompt to accept category context**

```typescript
// Change:
function buildPrompt(description: string): string {
  return `Generate a contractor estimate draft for the job description below.

Requirements:
- Use the create_estimate_draft tool.
- The tool input must include a non-empty sections array.
- Each section must include at least one line item.
- Use integer cents for all unit prices.
- Each line item must include description, quantity, unit, unit_price_low_cents, unit_price_typical_cents, unit_price_high_cents, markup_pct, and taxable.
- If the job description is brief, make reasonable contractor-style assumptions and still create a draft.

Job description:
${description}
`}
// To:
function buildPrompt(description: string, categoryContext?: string): string {
  const categorySection = categoryContext
    ? `\nContractor category guidance:\n${categoryContext}\n`
    : ''
  return `Generate a contractor estimate draft for the job description below.
${categorySection}
Requirements:
- Use the create_estimate_draft tool.
- The tool input must include a non-empty sections array.
- Each section must include at least one line item.
- Use integer cents for all unit prices.
- Each line item must include description, quantity, unit, unit_price_low_cents, unit_price_typical_cents, unit_price_high_cents, markup_pct, and taxable.
- If the job description is brief, make reasonable contractor-style assumptions and still create a draft.

Job description:
${description}
`}
```

- [ ] **Step 4: Pass category into buildPrompt in the handler**

Find the line in the handler where `buildPrompt` is called and update it. The handler reads the request body — add category extraction and pass it to buildPrompt. Find where `body` is destructured and add `category`:

```typescript
// Find the line that destructures body (around the handler body):
  const { estimate_id, description, zip_code, qa_pairs, attachment_ids } = body as AIDraftRequestBody
// Change to:
  const { estimate_id, description, zip_code, qa_pairs, attachment_ids, category } = body as AIDraftRequestBody
```

Then find the call to `buildPrompt` and update it:

```typescript
// Find (it will look like):
  const prompt = buildPrompt(enrichedContext)
// Change to:
  const categoryConfig = category ? CATEGORY_PROMPT_MAP[category] : null
  const prompt = buildPrompt(enrichedContext, categoryConfig?.draftPromptContext)
```

- [ ] **Step 5: Run type-check**

```bash
rtk tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
rtk git add api/ai/draft-estimate.ts && rtk git commit -m "feat: inject category prompt context into draft-estimate AI prompt"
```

---

## Task 9: Also pass category to fetchWizardQuestions from WizardStep5QA

**Files:**
- Modify: `src/components/wizard/WizardStep5QA.tsx`

- [ ] **Step 1: Read the file and find the fetchWizardQuestions call**

Open `src/components/wizard/WizardStep5QA.tsx` and find where `fetchWizardQuestions` is called and where `useWizardStore` is destructured.

- [ ] **Step 2: Add category to the store destructure**

Find the `useWizardStore` destructure and add `category`:

```typescript
// Before (will look something like):
  const { description, zipCode, photoFiles, setQAPairs, setStep, ... } = useWizardStore()
// After (add category):
  const { description, zipCode, photoFiles, category, setQAPairs, setStep, ... } = useWizardStore()
```

- [ ] **Step 3: Pass category to fetchWizardQuestions**

Find the `fetchWizardQuestions` call and add category:

```typescript
// Before:
    const questions = await fetchWizardQuestions({
      description,
      photoCount: photoFiles.length,
      zipCode: zipCode || undefined,
    })
// After:
    const questions = await fetchWizardQuestions({
      description,
      photoCount: photoFiles.length,
      zipCode: zipCode || undefined,
      category: category || undefined,
    })
```

- [ ] **Step 4: Run type-check and lint**

```bash
rtk tsc --noEmit && rtk lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/wizard/WizardStep5QA.tsx && rtk git commit -m "feat: pass category to wizard-questions API from Step 5"
```

---

## Task 10: Write Playwright tests

**Files:**
- Create: `tests/category-wizard.spec.ts`

> **Note:** These tests require the dev server to be running (`npm run dev`) and valid Supabase + Anthropic credentials in `.env.local`. They make real AI calls so they are slower (~30–60s per category). Run a focused subset during development.

- [ ] **Step 1: Create the test file**

```typescript
import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'

// Keyword sets used to loosely validate category-relevant Q&A and estimate content.
// These are intentionally broad — AI responses vary, we just check the category context was applied.
const CATEGORY_EXPECTATIONS: Record<string, { questionKeywords: string[]; sectionKeywords: string[] }> = {
  creative_services: {
    questionKeywords: ['deliverable', 'revision', 'brand', 'format', 'timeline', 'platform', 'style'],
    sectionKeywords: ['design', 'creative', 'production', 'revision', 'licensing', 'strategy'],
  },
  information_technology: {
    questionKeywords: ['stack', 'tech', 'timeline', 'access', 'security', 'compliance', 'team', 'maintenance'],
    sectionKeywords: ['development', 'testing', 'deployment', 'architecture', 'support', 'qa'],
  },
  business_finance: {
    questionKeywords: ['entity', 'account', 'transaction', 'fiscal', 'filing', 'tax', 'bookkeep'],
    sectionKeywords: ['bookkeeping', 'accounting', 'filing', 'advisory', 'compliance', 'setup'],
  },
  consulting: {
    questionKeywords: ['challenge', 'outcome', 'timeline', 'team', 'implementation', 'metric'],
    sectionKeywords: ['discovery', 'strategy', 'planning', 'recommendation', 'report', 'assessment'],
  },
  specialized_trades: {
    questionKeywords: ['install', 'repair', 'material', 'permit', 'access', 'site'],
    sectionKeywords: ['labor', 'material', 'permit', 'equipment', 'cleanup', 'inspection'],
  },
  general_contracting: {
    questionKeywords: ['scope', 'square', 'subcontract', 'permit', 'site', 'renovation', 'construction'],
    sectionKeywords: ['framing', 'site', 'mechanical', 'finish', 'management', 'structure'],
  },
  education_training: {
    questionKeywords: ['participant', 'session', 'objective', 'curriculum', 'remote', 'material'],
    sectionKeywords: ['curriculum', 'instruction', 'session', 'material', 'assessment', 'training'],
  },
  logistics_delivery: {
    questionKeywords: ['pickup', 'delivery', 'cargo', 'weight', 'handling', 'timeline', 'recurring'],
    sectionKeywords: ['delivery', 'distance', 'fuel', 'handling', 'insurance', 'surcharge'],
  },
  real_estate: {
    questionKeywords: ['property', 'transaction', 'listing', 'lease', 'commercial', 'residential'],
    sectionKeywords: ['listing', 'marketing', 'transaction', 'negotiation', 'coordination', 'management'],
  },
  wellness_personal_care: {
    questionKeywords: ['session', 'duration', 'mobile', 'product', 'treatment', 'package'],
    sectionKeywords: ['service', 'product', 'session', 'treatment', 'travel', 'package'],
  },
}

async function loginAsTestUser(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/auth`)
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL ?? '')
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD ?? '')
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15000 })
}

async function selectCategoryAndProceed(
  page: import('@playwright/test').Page,
  categoryLabel: string,
) {
  await page.goto(`${BASE_URL}/estimates/wizard`)
  // Step 0: category selection
  await expect(page.getByText('What type of work?')).toBeVisible({ timeout: 5000 })
  await page.getByText(categoryLabel).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  // Step 1: skip client
  await expect(page.getByText("Who's the client?")).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Skip' }).click()
  // Step 2: skip location
  await page.getByRole('button', { name: 'Skip' }).click()
  // Step 3: skip photos
  await page.getByRole('button', { name: 'Skip' }).click()
  // Step 4: add description
  await expect(page.getByPlaceholder(/describe/i).or(page.getByRole('textbox'))).toBeVisible({ timeout: 5000 })
  await page.getByRole('textbox').fill('Standard project requiring professional service.')
  await page.getByRole('button', { name: 'Continue' }).click()
}

for (const [categoryId, expectations] of Object.entries(CATEGORY_EXPECTATIONS)) {
  const categoryLabel = categoryId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  test(`${categoryLabel}: Q&A questions are category-relevant`, async ({ page }) => {
    test.setTimeout(90000)
    await loginAsTestUser(page)
    await selectCategoryAndProceed(page, categoryLabel)

    // Step 5: wait for AI-generated questions
    await expect(page.getByText(/question/i).first()).toBeVisible({ timeout: 30000 })

    const pageText = (await page.textContent('body') ?? '').toLowerCase()
    const hasRelevantQuestion = expectations.questionKeywords.some((kw) =>
      pageText.includes(kw.toLowerCase())
    )
    expect(
      hasRelevantQuestion,
      `Expected at least one keyword from [${expectations.questionKeywords.join(', ')}] in Q&A for ${categoryLabel}`
    ).toBe(true)
  })

  test(`${categoryLabel}: estimate draft sections are category-relevant`, async ({ page }) => {
    test.setTimeout(120000)
    await loginAsTestUser(page)
    await selectCategoryAndProceed(page, categoryLabel)

    // Step 5: skip all questions and proceed to generating
    await page.waitForTimeout(3000) // wait for questions to load
    await page.getByRole('button', { name: /skip|continue|generate/i }).last().click()

    // Generating screen → estimate editor
    await page.waitForURL(/\/estimates\/[a-f0-9-]+/, { timeout: 60000 })

    const pageText = (await page.textContent('body') ?? '').toLowerCase()
    const hasRelevantSection = expectations.sectionKeywords.some((kw) =>
      pageText.includes(kw.toLowerCase())
    )
    expect(
      hasRelevantSection,
      `Expected at least one section keyword from [${expectations.sectionKeywords.join(', ')}] in estimate for ${categoryLabel}`
    ).toBe(true)
  })
}
```

- [ ] **Step 2: Add TEST_USER_EMAIL and TEST_USER_PASSWORD to .env.example**

Open `.env.example` and add at the bottom:

```
# Playwright test credentials (do not use a real account)
TEST_USER_EMAIL=
TEST_USER_PASSWORD=
```

- [ ] **Step 3: Check Playwright is installed**

```bash
rtk npx playwright --version
```

If not installed: `npm install -D @playwright/test` and `npx playwright install chromium`.

- [ ] **Step 4: Run a smoke test on one category (dev server must be running)**

```bash
rtk npx playwright test tests/category-wizard.spec.ts --grep "Specialized Trades: Q&A" --headed
```

Expected: browser opens, wizard flows to Q&A step, test passes if words like "install", "repair", or "material" appear.

- [ ] **Step 5: Commit**

```bash
rtk git add tests/category-wizard.spec.ts .env.example && rtk git commit -m "test: add Playwright category wizard tests for all 10 categories"
```

---

## Task 11: Final validation

- [ ] **Step 1: Run type-check and lint**

```bash
rtk tsc --noEmit && rtk lint
```

Expected: no errors.

- [ ] **Step 2: Start dev server and manually verify step 0**

```bash
npm run dev
```

Open `http://localhost:5173/estimates/wizard` and confirm:
- Step 0 shows "What type of work?" with a 2-column icon grid
- Selecting a category highlights the card and enables Continue
- Proceeding through all steps reaches the estimate editor
- Back button on Step 1 returns to Step 0 with selection preserved

- [ ] **Step 3: Manually verify two categories produce different estimates**

Run wizard with **Specialized Trades** (description: "Install new HVAC system in 2000 sq ft home") — confirm sections include Labor and Materials.

Run wizard with **Creative Services** (description: "Design a new logo and brand identity") — confirm sections include Design/Production and no material markup sections.

- [ ] **Step 4: Commit final state if any changes**

```bash
rtk git status
```

If clean, done. If not: stage and commit any remaining changes.
