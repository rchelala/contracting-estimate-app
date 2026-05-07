# Estimate Creation Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the instant-create `/estimates/new` flow with a 5-step full-screen wizard that collects client, location, photos, description, and AI Q&A before generating a pre-populated estimate.

**Architecture:** A new `/estimates/wizard` route mounts `EstimateWizardPage`, which renders one of 5 step components or a generating screen based on a Zustand `wizardStore`. Steps collect data in memory (no DB writes). On "Generate Estimate", the generating screen creates the estimate record, uploads photos, then calls an extended AI endpoint that uses vision + Q&A context. On completion it navigates to the estimate editor.

**Tech Stack:** React 18, TypeScript strict, Zustand, Supabase Storage, Tailwind CSS, Web Speech API (voice), Anthropic Claude vision API via Vercel serverless

---

## File Map

**Create:**
- `src/stores/wizardStore.ts` — wizard state (step, collected data, files)
- `src/hooks/useVoiceInput.ts` — Web Speech API hook (Step 4 + Step 5)
- `src/pages/EstimateWizardPage.tsx` — wizard router/container
- `src/components/wizard/WizardShell.tsx` — progress bar, Back, Skip chrome
- `src/components/wizard/WizardStep1Client.tsx` — client search + create
- `src/components/wizard/WizardStep2Location.tsx` — ZIP code input
- `src/components/wizard/WizardStep3Capture.tsx` — photo/video grid + upload
- `src/components/wizard/WizardStep4Describe.tsx` — textarea + voice
- `src/components/wizard/WizardStep5QA.tsx` — AI Q&A chat + show-all toggle
- `src/components/wizard/WizardGenerating.tsx` — loading screen + orchestration
- `src/services/wizard.ts` — `fetchWizardQuestions()`, `draftEstimateFromWizard()`
- `api/ai/wizard-questions.ts` — Vercel serverless: returns AI-generated Q&A questions

**Modify:**
- `src/App.tsx` — add `/estimates/wizard` route (replace `/estimates/new` button target)
- `src/pages/DashboardPage.tsx` — change "New Estimate" button href to `/estimates/wizard`
- `api/ai/draft-estimate.ts` — extend to accept `zip_code`, `qa_pairs`, `attachment_ids`; add Claude vision for photos

---

## Task 1: Wizard Store + Types

**Files:**
- Create: `src/stores/wizardStore.ts`
- Create: `src/stores/wizardStore.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/stores/wizardStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useWizardStore } from './wizardStore'
import { act } from '@testing-library/react'

describe('wizardStore', () => {
  beforeEach(() => {
    act(() => useWizardStore.getState().reset())
  })

  it('starts at step 1 with all fields empty', () => {
    const s = useWizardStore.getState()
    expect(s.step).toBe(1)
    expect(s.clientId).toBeNull()
    expect(s.zipCode).toBe('')
    expect(s.photoFiles).toHaveLength(0)
    expect(s.description).toBe('')
    expect(s.qaPairs).toHaveLength(0)
  })

  it('setStep advances step', () => {
    act(() => useWizardStore.getState().setStep(3))
    expect(useWizardStore.getState().step).toBe(3)
  })

  it('setClientId stores client', () => {
    act(() => useWizardStore.getState().setClientId('abc'))
    expect(useWizardStore.getState().clientId).toBe('abc')
  })

  it('addPhotoFile adds a file', () => {
    const f = new File([''], 'photo.jpg', { type: 'image/jpeg' })
    act(() => useWizardStore.getState().addPhotoFile(f))
    expect(useWizardStore.getState().photoFiles).toHaveLength(1)
  })

  it('removePhotoFile removes by index', () => {
    const f1 = new File([''], 'a.jpg', { type: 'image/jpeg' })
    const f2 = new File([''], 'b.jpg', { type: 'image/jpeg' })
    act(() => {
      useWizardStore.getState().addPhotoFile(f1)
      useWizardStore.getState().addPhotoFile(f2)
      useWizardStore.getState().removePhotoFile(0)
    })
    expect(useWizardStore.getState().photoFiles).toHaveLength(1)
    expect(useWizardStore.getState().photoFiles[0].name).toBe('b.jpg')
  })

  it('setQAPairs replaces all pairs', () => {
    act(() => useWizardStore.getState().setQAPairs([
      { question: 'Is it leaking?', answer: null }
    ]))
    expect(useWizardStore.getState().qaPairs).toHaveLength(1)
  })

  it('answerQuestion updates answer at index', () => {
    act(() => {
      useWizardStore.getState().setQAPairs([
        { question: 'Q1', answer: null },
        { question: 'Q2', answer: null },
      ])
      useWizardStore.getState().answerQuestion(1, 'Yes')
    })
    expect(useWizardStore.getState().qaPairs[1].answer).toBe('Yes')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd "c:\Users\rober\OneDrive\Documents\Contracting Estimate App"
rtk npx vitest run src/stores/wizardStore.test.ts
```
Expected: FAIL — `wizardStore` not found

- [ ] **Step 3: Implement the store**

```typescript
// src/stores/wizardStore.ts
import { create } from 'zustand'

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 'generating'

export interface QAPair {
  question: string
  answer: string | null
}

interface WizardState {
  step: WizardStep
  organizationId: string | null
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
  step: 1 as WizardStep,
  organizationId: null,
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

- [ ] **Step 4: Run tests — confirm passing**

```bash
rtk npx vitest run src/stores/wizardStore.test.ts
```
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
rtk git add src/stores/wizardStore.ts src/stores/wizardStore.test.ts
rtk git commit -m "feat(wizard): add wizardStore with step and data state"
```

---

## Task 2: useVoiceInput Hook

**Files:**
- Create: `src/hooks/useVoiceInput.ts`
- Create: `src/hooks/useVoiceInput.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/hooks/useVoiceInput.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoiceInput } from './useVoiceInput'

describe('useVoiceInput', () => {
  it('returns isSupported=false when SpeechRecognition is not in window', () => {
    const { result } = renderHook(() => useVoiceInput({ onTranscript: vi.fn() }))
    expect(result.current.isSupported).toBe(false)
  })

  it('isListening starts false', () => {
    const { result } = renderHook(() => useVoiceInput({ onTranscript: vi.fn() }))
    expect(result.current.isListening).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
rtk npx vitest run src/hooks/useVoiceInput.test.ts
```

- [ ] **Step 3: Implement the hook**

```typescript
// src/hooks/useVoiceInput.ts
import { useState, useRef, useCallback } from 'react'

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void
}

interface UseVoiceInputResult {
  isSupported: boolean
  isListening: boolean
  start: () => void
  stop: () => void
}

type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: Event) => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

export function useVoiceInput({ onTranscript }: UseVoiceInputOptions): UseVoiceInputResult {
  const SpeechRecognitionClass =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : undefined

  const isSupported = !!SpeechRecognitionClass
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const start = useCallback(() => {
    if (!SpeechRecognitionClass) return
    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ')
      onTranscript(transcript)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }, [SpeechRecognitionClass, onTranscript])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  return { isSupported, isListening, start, stop }
}
```

- [ ] **Step 4: Run tests**

```bash
rtk npx vitest run src/hooks/useVoiceInput.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/hooks/useVoiceInput.ts src/hooks/useVoiceInput.test.ts
rtk git commit -m "feat(wizard): add useVoiceInput hook with Web Speech API"
```

---

## Task 3: WizardShell + Route Wiring

**Files:**
- Create: `src/components/wizard/WizardShell.tsx`
- Create: `src/pages/EstimateWizardPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create WizardShell**

```typescript
// src/components/wizard/WizardShell.tsx
import type { ReactNode } from 'react'

interface WizardShellProps {
  step: number        // 1–5
  totalSteps?: number // default 5
  title: string
  subtitle?: string
  onBack?: () => void
  onSkip?: () => void
  skipLabel?: string
  children: ReactNode
}

export function WizardShell({
  step,
  totalSteps = 5,
  title,
  subtitle,
  onBack,
  onSkip,
  skipLabel = 'Skip',
  children,
}: WizardShellProps) {
  const progress = (step / totalSteps) * 100
  const isLastStep = step === totalSteps
  const barColor = isLastStep ? 'bg-amber-400' : 'bg-blue-500'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button
          onClick={onBack}
          className="text-slate-400 text-sm w-14"
          disabled={!onBack}
        >
          {onBack ? '← Back' : ''}
        </button>
        <span className="font-semibold text-sm">New Estimate</span>
        <button
          onClick={onSkip}
          className="text-blue-500 text-sm w-14 text-right"
        >
          {onSkip ? skipLabel : ''}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        {/* Progress bar */}
        <div className="h-1 bg-slate-200 rounded-full mb-5">
          <div
            className={`h-1 rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <h1 className="text-xl font-bold mb-1">{title}</h1>
        {subtitle && <p className="text-slate-500 text-sm mb-5">{subtitle}</p>}

        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create EstimateWizardPage**

```typescript
// src/pages/EstimateWizardPage.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizardStore } from '../stores/wizardStore'
import { supabase } from '../lib/supabase'
import { WizardStep1Client } from '../components/wizard/WizardStep1Client'
import { WizardStep2Location } from '../components/wizard/WizardStep2Location'
import { WizardStep3Capture } from '../components/wizard/WizardStep3Capture'
import { WizardStep4Describe } from '../components/wizard/WizardStep4Describe'
import { WizardStep5QA } from '../components/wizard/WizardStep5QA'
import { WizardGenerating } from '../components/wizard/WizardGenerating'

export default function EstimateWizardPage() {
  const { step, reset, setOrganizationId } = useWizardStore()
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

  if (step === 1) return <WizardStep1Client />
  if (step === 2) return <WizardStep2Location />
  if (step === 3) return <WizardStep3Capture />
  if (step === 4) return <WizardStep4Describe />
  if (step === 5) return <WizardStep5QA />
  if (step === 'generating') return <WizardGenerating />

  return null
}
```

- [ ] **Step 3: Add route in App.tsx**

In `src/App.tsx`, find the existing `/estimates/new` route and add the wizard route alongside it:

```typescript
import EstimateWizardPage from './pages/EstimateWizardPage'

// Add inside the routes, next to /estimates/new:
<Route path="/estimates/wizard" element={<EstimateWizardPage />} />
```

- [ ] **Step 4: Update Dashboard "New Estimate" button**

In `src/pages/DashboardPage.tsx`, find the button/link that navigates to `/estimates/new` and change it to `/estimates/wizard`.

Search for the string `estimates/new` in the file and replace with `estimates/wizard`.

- [ ] **Step 5: Run the dev server and verify route loads**

```bash
npm run dev
```

Open `http://localhost:5173/estimates/wizard` — should render a blank page (step components not yet built) without crashing.

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/wizard/WizardShell.tsx src/pages/EstimateWizardPage.tsx src/App.tsx src/pages/DashboardPage.tsx
rtk git commit -m "feat(wizard): add wizard route, WizardShell chrome, EstimateWizardPage"
```

---

## Task 4: Step 1 — Client

**Files:**
- Create: `src/components/wizard/WizardStep1Client.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/wizard/WizardStep1Client.tsx
import { useState, useEffect } from 'react'
import { useWizardStore } from '../../stores/wizardStore'
import { listClients, createClient } from '../../services/clients'
import type { Database } from '../../types/database.types'
import { WizardShell } from './WizardShell'

type ClientRow = Database['public']['Tables']['clients']['Row']

export function WizardStep1Client() {
  const { setStep, setClientId, setNewClientFields, newClientName, newClientEmail,
    newClientPhone, clientId, organizationId } = useWizardStore()

  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<ClientRow[]>([])
  const [showNewForm, setShowNewForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listClients().then((rows) => { setClients(rows); setLoading(false) })
  }, [])

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(query.toLowerCase())
  )

  const canContinue = clientId !== null || newClientName.trim().length > 0

  async function handleContinue() {
    if (newClientName.trim() && !clientId && organizationId) {
      const created = await createClient({
        organization_id: organizationId,
        name: newClientName.trim(),
        email: newClientEmail || null,
        phone: newClientPhone || null,
      })
      setClientId(created.id)
    }
    setStep(2)
  }

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <WizardShell
      step={1}
      title="Who's the client?"
      subtitle="Step 1 of 5"
      onSkip={() => setStep(2)}
    >
      {/* Search */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="text"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search clients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Results */}
      {!loading && (
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => { setClientId(c.id); setShowNewForm(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                clientId === c.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {initials(c.name)}
              </div>
              <div>
                <div className="font-medium text-sm">{c.name}</div>
                {c.email && <div className="text-slate-500 text-xs">{c.email}</div>}
              </div>
            </button>
          ))}

          <button
            onClick={() => { setShowNewForm(true); setClientId(null) }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-blue-500 hover:bg-slate-50"
          >
            <span className="text-lg font-light">+</span>
            <span className="text-sm font-semibold">New client</span>
          </button>
        </div>
      )}

      {/* New client inline form */}
      {showNewForm && (
        <div className="border border-blue-200 rounded-lg p-3 mb-4 bg-blue-50 space-y-2">
          <input
            type="text"
            className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
            placeholder="Full name *"
            value={newClientName}
            onChange={(e) => setNewClientFields({ name: e.target.value })}
          />
          <input
            type="email"
            className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
            placeholder="Email (optional)"
            value={newClientEmail}
            onChange={(e) => setNewClientFields({ email: e.target.value })}
          />
          <input
            type="tel"
            className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
            placeholder="Phone (optional)"
            value={newClientPhone}
            onChange={(e) => setNewClientFields({ phone: e.target.value })}
          />
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full bg-blue-500 text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-40"
      >
        Continue →
      </button>
    </WizardShell>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/estimates/wizard` — should show Step 1 with client search. Try searching, selecting, creating new client, skip, and continue.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/wizard/WizardStep1Client.tsx
rtk git commit -m "feat(wizard): step 1 client search and create"
```

---

## Task 5: Step 2 — Location

**Files:**
- Create: `src/components/wizard/WizardStep2Location.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/wizard/WizardStep2Location.tsx
import { useWizardStore } from '../../stores/wizardStore'
import { WizardShell } from './WizardShell'

export function WizardStep2Location() {
  const { step, zipCode, setZipCode, setStep } = useWizardStore()

  const canContinue = zipCode.length === 5 && /^\d{5}$/.test(zipCode)

  return (
    <WizardShell
      step={2}
      title="Job location?"
      subtitle="Step 2 of 5"
      onBack={() => setStep(1)}
      onSkip={() => setStep(3)}
    >
      <div className="flex flex-col items-center mb-6">
        <input
          type="tel"
          inputMode="numeric"
          maxLength={5}
          className="border-2 border-blue-500 rounded-xl text-3xl font-bold tracking-widest text-center w-44 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="·····"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
        />
        <p className="text-slate-400 text-sm mt-2">Enter zip code</p>
      </div>

      <div className="bg-blue-50 rounded-lg p-3 mb-6 text-sm text-slate-600">
        <strong>Why we ask:</strong> Helps AI estimate local labor and material costs.
        Also used for tax rates when payments are added.
      </div>

      <button
        onClick={() => setStep(3)}
        disabled={!canContinue}
        className="w-full bg-blue-500 text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-40"
      >
        Continue →
      </button>
    </WizardShell>
  )
}
```

- [ ] **Step 2: Verify in browser** — navigate through steps 1 → 2, confirm numeric input, Back, Skip, Continue.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/wizard/WizardStep2Location.tsx
rtk git commit -m "feat(wizard): step 2 zip code location"
```

---

## Task 6: Step 3 — Capture (Photos + Video)

**Files:**
- Create: `src/components/wizard/WizardStep3Capture.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/wizard/WizardStep3Capture.tsx
import { useRef } from 'react'
import { useWizardStore } from '../../stores/wizardStore'
import { WizardShell } from './WizardShell'

const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp,image/gif'
const ACCEPTED_VIDEO = 'video/mp4,video/quicktime,video/webm'

export function WizardStep3Capture() {
  const { photoFiles, videoFile, addPhotoFile, removePhotoFile, setVideoFile, setStep } = useWizardStore()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach((f) => addPhotoFile(f))
  }

  const thumbnails = photoFiles.map((f) => URL.createObjectURL(f))

  return (
    <WizardShell
      step={3}
      title="Capture the job"
      subtitle="Step 3 of 5 · Photos help AI understand the scope"
      onBack={() => setStep(2)}
      onSkip={() => setStep(4)}
    >
      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {thumbnails.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removePhotoFile(i)}
              className="absolute top-1 right-1 bg-black/40 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>
        ))}

        {videoFile && (
          <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-200 flex items-center justify-center">
            <span className="text-2xl">🎬</span>
            <button
              onClick={() => setVideoFile(null)}
              className="absolute top-1 right-1 bg-black/40 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {photoFiles.length < 10 && (
          <button
            onClick={() => photoInputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-2xl hover:border-blue-300 hover:text-blue-400"
          >
            +
          </button>
        )}
      </div>

      {/* Upload buttons */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          📷 Camera
        </button>
        <button
          onClick={() => photoInputRef.current?.click()}
          className="border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          🖼 Library
        </button>
        <button
          onClick={() => videoInputRef.current?.click()}
          disabled={!!videoFile}
          className="border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          🎬 Video
        </button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept={ACCEPTED_IMAGES}
        multiple
        className="hidden"
        onChange={(e) => handlePhotoFiles(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPTED_IMAGES}
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handlePhotoFiles(e.target.files)}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept={ACCEPTED_VIDEO}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setVideoFile(f)
        }}
      />

      <button
        onClick={() => setStep(4)}
        className="w-full bg-blue-500 text-white rounded-lg py-2.5 font-semibold text-sm"
      >
        Continue →
      </button>
    </WizardShell>
  )
}
```

- [ ] **Step 2: Verify in browser** — add photos, remove photos, add video, continue, back, skip.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/wizard/WizardStep3Capture.tsx
rtk git commit -m "feat(wizard): step 3 photo and video capture"
```

---

## Task 7: Step 4 — Describe (Voice + Text)

**Files:**
- Create: `src/components/wizard/WizardStep4Describe.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/wizard/WizardStep4Describe.tsx
import { useWizardStore } from '../../stores/wizardStore'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { WizardShell } from './WizardShell'

export function WizardStep4Describe() {
  const { description, setDescription, setStep } = useWizardStore()

  const { isSupported, isListening, start, stop } = useVoiceInput({
    onTranscript: (text) => setDescription(description + (description ? ' ' : '') + text),
  })

  return (
    <WizardShell
      step={4}
      title="Describe the job"
      subtitle="Step 4 of 5 · Speak or type what needs to be done"
      onBack={() => setStep(3)}
      onSkip={() => setStep(5)}
    >
      <div className="relative mb-3">
        <textarea
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={5}
          placeholder="e.g. Replace roof on 2,000 sq ft home, tear-off needed, been leaking in the northeast corner for 2 weeks..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {isSupported && (
          <button
            onClick={isListening ? stop : start}
            className={`absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-colors ${
              isListening ? 'bg-red-500' : 'bg-blue-500'
            } text-white`}
            title={isListening ? 'Stop recording' : 'Start voice input'}
          >
            🎤
          </button>
        )}
      </div>

      {isSupported && (
        <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-600 flex items-center gap-2 mb-5">
          <span>💡</span>
          <span>
            {isListening
              ? 'Listening… speak now'
              : 'Tap 🎤 to speak — your words appear here automatically'}
          </span>
        </div>
      )}

      <button
        onClick={() => setStep(5)}
        className="w-full bg-blue-500 text-white rounded-lg py-2.5 font-semibold text-sm"
      >
        Continue →
      </button>
    </WizardShell>
  )
}
```

- [ ] **Step 2: Verify in browser** — type in textarea, try mic (in Chrome), back, skip.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/wizard/WizardStep4Describe.tsx
rtk git commit -m "feat(wizard): step 4 job description with voice input"
```

---

## Task 8: wizard-questions API Endpoint

**Files:**
- Create: `api/ai/wizard-questions.ts`
- Create: `src/services/wizard.ts`

- [ ] **Step 1: Create the API endpoint**

```typescript
// api/ai/wizard-questions.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { createAuthSupabase } from '../lib/supabase'

interface WizardQuestionsRequest {
  description: string
  photo_count: number
  zip_code?: string
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authorization = req.headers.authorization ?? ''
  const supabase = createAuthSupabase(authorization)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return res.status(401).json({ error: 'Authentication required' })

  const { description, photo_count, zip_code } = req.body as WizardQuestionsRequest

  if (typeof description !== 'string') {
    return res.status(400).json({ error: 'description is required' })
  }

  const locationContext = zip_code ? ` The job is in zip code ${zip_code}.` : ''
  const photoContext = photo_count > 0
    ? ` The contractor has provided ${photo_count} photo(s) of the job site.`
    : ''

  const prompt = `You are an experienced general contractor reviewing a new job inquiry. Based on the job description below, generate 3 to 5 focused follow-up questions that will help you scope the work and price it accurately. Questions should be short, practical, and directly relevant to the work described.

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

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'
    
    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/)
    const questions: string[] = match ? JSON.parse(match[0]) : []

    return res.status(200).json({ questions })
  } catch (err) {
    console.error('wizard-questions error:', err)
    return res.status(502).json({ error: 'Failed to generate questions' })
  }
}
```

- [ ] **Step 2: Create wizard service**

```typescript
// src/services/wizard.ts
import { supabase } from '../lib/supabase'

export interface WizardDraftInput {
  estimateId: string
  description: string
  zipCode?: string
  qaPairs: { question: string; answer: string | null }[]
  attachmentIds: string[]
}

export async function fetchWizardQuestions(input: {
  description: string
  photoCount: number
  zipCode?: string
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
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
    throw new Error(err.error ?? 'Failed to draft estimate')
  }
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add api/ai/wizard-questions.ts src/services/wizard.ts
rtk git commit -m "feat(wizard): add wizard-questions API endpoint and wizard service"
```

---

## Task 9: Step 5 — AI Q&A

**Files:**
- Create: `src/components/wizard/WizardStep5QA.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/wizard/WizardStep5QA.tsx
import { useEffect, useState } from 'react'
import { useWizardStore } from '../../stores/wizardStore'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { fetchWizardQuestions } from '../../services/wizard'

export function WizardStep5QA() {
  const {
    description, zipCode, photoFiles, qaPairs, setQAPairs, answerQuestion,
    currentQuestionIndex, setCurrentQuestionIndex, showAllMode, setShowAllMode, setStep,
  } = useWizardStore()

  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [inputText, setInputText] = useState('')

  const { isSupported, isListening, start, stop } = useVoiceInput({
    onTranscript: (text) => setInputText((prev) => prev + (prev ? ' ' : '') + text),
  })

  useEffect(() => {
    fetchWizardQuestions({
      description,
      photoCount: photoFiles.length,
      zipCode: zipCode || undefined,
    })
      .then((questions) => {
        setQAPairs(questions.map((q) => ({ question: q, answer: null })))
      })
      .catch(() => {
        // Fallback: proceed without questions
        setQAPairs([])
      })
      .finally(() => setLoadingQuestions(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const allAnswered = qaPairs.every((p) => p.answer !== null)
  const canGenerate = !loadingQuestions

  function handleSend() {
    if (inputText.trim()) {
      answerQuestion(currentQuestionIndex, inputText.trim())
      setInputText('')
      if (currentQuestionIndex < qaPairs.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
      }
    }
  }

  function handleSkipQuestion() {
    answerQuestion(currentQuestionIndex, null)
    if (currentQuestionIndex < qaPairs.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  if (loadingQuestions) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🤖</div>
          <p className="text-slate-500 text-sm">Thinking of questions…</p>
        </div>
      </div>
    )
  }

  const currentPair = qaPairs[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button onClick={() => setStep(4)} className="text-slate-400 text-sm w-14">← Back</button>
        <span className="font-semibold text-sm">New Estimate</span>
        <button
          onClick={() => setShowAllMode(!showAllMode)}
          className="text-blue-500 text-sm w-24 text-right"
        >
          {showAllMode ? 'One at a time' : 'Show all'}
        </button>
      </div>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        {/* Progress bar — full amber */}
        <div className="h-1 bg-slate-200 rounded-full mb-5">
          <div className="h-1 rounded-full bg-amber-400 w-full" />
        </div>

        {!showAllMode ? (
          /* Chat mode */
          <>
            <h1 className="text-xl font-bold mb-1">A few quick questions</h1>
            <p className="text-slate-400 text-xs mb-5">
              Step 5 of 5 · Question {currentQuestionIndex + 1} of {qaPairs.length}
            </p>

            {/* Previous answered questions */}
            {qaPairs.slice(0, currentQuestionIndex).map((p, i) => (
              <div key={i} className="mb-3 opacity-50">
                <div className="text-xs text-slate-400 mb-1">AI Contractor</div>
                <div className="bg-slate-100 rounded-lg px-3 py-2 text-sm text-slate-500">{`"${p.question}"`}</div>
                {p.answer && (
                  <div className="flex justify-end mt-1">
                    <div className="bg-blue-500 text-white rounded-lg px-3 py-1.5 text-sm">{`"${p.answer}"`}</div>
                  </div>
                )}
              </div>
            ))}

            {/* Current question */}
            {currentPair && (
              <div className="mb-4">
                <div className="text-xs text-slate-400 mb-1">AI Contractor</div>
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg px-3 py-2.5 text-sm text-blue-800 leading-relaxed">
                  {`"${currentPair.question}"`}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="relative mb-3">
              <input
                type="text"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type or tap mic to speak..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              {isSupported && (
                <button
                  onClick={isListening ? stop : start}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs ${
                    isListening ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                >
                  🎤
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={handleSkipQuestion} className="text-sm text-slate-400">
                Skip question →
              </button>
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Send
              </button>
            </div>

            {(allAnswered || currentQuestionIndex >= qaPairs.length - 1) && (
              <button
                onClick={() => setStep('generating')}
                className="w-full mt-4 bg-amber-400 text-white rounded-lg py-2.5 font-semibold text-sm"
              >
                Generate Estimate →
              </button>
            )}
          </>
        ) : (
          /* Show-all form mode */
          <>
            <h1 className="text-xl font-bold mb-1">AI follow-up questions</h1>
            <p className="text-slate-400 text-xs mb-5">Answer what you know — skip the rest</p>

            {qaPairs.map((p, i) => (
              <div key={i} className={`mb-4 ${p.answer ? 'opacity-50' : ''}`}>
                <div className={`text-xs mb-1.5 font-${p.answer ? 'normal text-slate-400' : 'semibold text-blue-800'}`}>
                  {i + 1}. {p.question}
                </div>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Skip if unsure"
                  value={p.answer ?? ''}
                  onChange={(e) => answerQuestion(i, e.target.value || null as unknown as string)}
                />
              </div>
            ))}

            <button
              onClick={() => setStep('generating')}
              disabled={!canGenerate}
              className="w-full bg-amber-400 text-white rounded-lg py-2.5 font-semibold text-sm mt-2 disabled:opacity-40"
            >
              Generate Estimate →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser** — advance to step 5, confirm questions load, answer/skip, toggle show-all mode, "Generate Estimate" button appears.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/wizard/WizardStep5QA.tsx
rtk git commit -m "feat(wizard): step 5 AI Q&A with chat and show-all modes"
```

---

## Task 10: Extend draft-estimate API (zip, Q&A, vision)

**Files:**
- Modify: `api/ai/draft-estimate.ts`

The endpoint currently accepts `{ estimate_id, description }`. Extend it to also accept `zip_code`, `qa_pairs`, and `attachment_ids`.

- [ ] **Step 1: Read the current endpoint**

Read `api/ai/draft-estimate.ts` in full to understand where to inject the new parameters.

- [ ] **Step 2: Extend the request type**

Find the `AIDraftRequestBody` interface (or equivalent inline parsing) and add:

```typescript
// Additional optional fields
zip_code?: string
qa_pairs?: { question: string; answer: string | null }[]
attachment_ids?: string[]
```

- [ ] **Step 3: Build enriched context string**

Before the Anthropic API call, add logic to build an enriched description. Find the spot where the `description` variable is used in the prompt and replace with:

```typescript
function buildEnrichedContext(
  description: string,
  zipCode?: string,
  qaPairs?: { question: string; answer: string | null }[]
): string {
  let context = description || '(No description provided)'

  if (zipCode) {
    context += `\n\nJob location ZIP code: ${zipCode} — use regional labor and material pricing for this area.`
  }

  if (qaPairs && qaPairs.length > 0) {
    const answered = qaPairs.filter((p) => p.answer)
    if (answered.length > 0) {
      context += '\n\nContractor Q&A:\n'
      answered.forEach((p) => {
        context += `Q: ${p.question}\nA: ${p.answer}\n`
      })
    }
  }

  return context
}
```

Use `buildEnrichedContext(description, zip_code, qa_pairs)` wherever the bare `description` was passed to the AI prompt.

- [ ] **Step 4: Add vision support for photo attachments**

When `attachment_ids` is provided and non-empty, fetch the storage paths from the database and build base64 image blocks for Claude. Add this function near the top of the handler (after auth check, before the AI call):

```typescript
async function buildImageBlocks(
  attachmentIds: string[],
  serviceSupabase: ReturnType<typeof getServiceSupabase>
): Promise<Anthropic.ImageBlockParam[]> {
  if (!attachmentIds.length) return []

  const { data: attachments } = await serviceSupabase
    .from('estimate_attachments')
    .select('storage_path, content_type')
    .in('id', attachmentIds)

  if (!attachments?.length) return []

  const blocks: Anthropic.ImageBlockParam[] = []

  for (const att of attachments) {
    // Only pass image types to Claude (skip video)
    if (!att.content_type.startsWith('image/')) continue

    const { data: signedData } = await serviceSupabase.storage
      .from('estimate-attachments')
      .createSignedUrl(att.storage_path, 60)

    if (!signedData?.signedUrl) continue

    try {
      const imgResponse = await fetch(signedData.signedUrl)
      const buffer = await imgResponse.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mediaType = att.content_type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      })
    } catch {
      // Skip unloadable images — don't fail the whole request
    }
  }

  return blocks
}
```

Then in the messages array passed to `client.messages.create`, include image blocks before the text content:

```typescript
const imageBlocks = await buildImageBlocks(attachment_ids ?? [], serviceSupabase)
const enrichedContext = buildEnrichedContext(description, zip_code, qa_pairs)

// In the messages array:
const userContent: Anthropic.ContentBlockParam[] = [
  ...imageBlocks,
  { type: 'text', text: enrichedContext },
]
```

Pass `userContent` instead of the bare string to the messages array.

- [ ] **Step 5: Test manually with curl**

```bash
# Get a session token from the app (browser devtools → Network → any Supabase request → Authorization header)
curl -X POST http://localhost:5173/api/ai/draft-estimate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "estimate_id": "<existing-draft-estimate-id>",
    "description": "Replace roof, leaking NE corner",
    "zip_code": "90210",
    "qa_pairs": [{"question": "Roof size?", "answer": "2000 sq ft"}]
  }'
```
Expected: 200 with `{ estimate_id, sections }`.

- [ ] **Step 6: Commit**

```bash
rtk git add api/ai/draft-estimate.ts
rtk git commit -m "feat(wizard): extend draft-estimate with zip, Q&A context, and vision"
```

---

## Task 11: WizardGenerating Screen (Orchestration)

**Files:**
- Create: `src/components/wizard/WizardGenerating.tsx`

This is the most important component — it does the actual work: creates the estimate, uploads photos, calls AI, navigates to editor.

- [ ] **Step 1: Create the component**

```typescript
// src/components/wizard/WizardGenerating.tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizardStore } from '../../stores/wizardStore'
import { createEstimate, updateEstimate } from '../../services/estimates'
import { uploadAttachment } from '../../services/attachments'
import { createClient } from '../../services/clients'
import { draftEstimateFromWizard } from '../../services/wizard'

type ProgressStep = {
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
}

export function WizardGenerating() {
  const {
    organizationId, clientId, newClientName, newClientEmail, newClientPhone,
    zipCode, photoFiles, videoFile, description, qaPairs, reset,
  } = useWizardStore()

  const navigate = useNavigate()
  const hasRun = useRef(false)

  const [steps, setSteps] = useState<ProgressStep[]>([
    { label: 'Reviewed job description', status: 'pending' },
    { label: 'Uploading photos', status: 'pending' },
    { label: 'Writing line items…', status: 'pending' },
    { label: `Applying ${zipCode || 'regional'} labor rates`, status: 'pending' },
  ])
  const [error, setError] = useState<string | null>(null)

  function updateStep(index: number, status: ProgressStep['status']) {
    setSteps((prev) => prev.map((s, i) => i === index ? { ...s, status } : s))
  }

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true
    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function run() {
    if (!organizationId) {
      setError('Organization not found. Please reload and try again.')
      return
    }

    try {
      // Step 1: Create estimate
      updateStep(0, 'running')
      const estimate = await createEstimate(organizationId)

      // Attach client if provided
      let resolvedClientId = clientId
      if (!resolvedClientId && newClientName.trim()) {
        const created = await createClient({
          organization_id: organizationId,
          name: newClientName.trim(),
          email: newClientEmail || null,
          phone: newClientPhone || null,
        })
        resolvedClientId = created.id
      }

      const patch: Record<string, unknown> = {}
      if (resolvedClientId) patch.client_id = resolvedClientId
      if (zipCode) patch.tax_zip = zipCode
      if (Object.keys(patch).length) await updateEstimate(estimate.id, patch)

      updateStep(0, 'done')

      // Step 2: Upload photos
      updateStep(1, 'running')
      const attachmentIds: string[] = []

      for (const file of photoFiles) {
        const att = await uploadAttachment({
          file,
          organization_id: organizationId,
          estimate_id: estimate.id,
        })
        attachmentIds.push(att.id)
      }

      if (videoFile) {
        const att = await uploadAttachment({
          file: videoFile,
          organization_id: organizationId,
          estimate_id: estimate.id,
        })
        attachmentIds.push(att.id)
      }

      updateStep(1, 'done')

      // Step 3 & 4: AI drafting
      updateStep(2, 'running')
      updateStep(3, 'running')

      await draftEstimateFromWizard({
        estimateId: estimate.id,
        description,
        zipCode: zipCode || undefined,
        qaPairs,
        attachmentIds,
      })

      updateStep(2, 'done')
      updateStep(3, 'done')

      // Navigate to editor
      reset()
      navigate(`/estimates/${estimate.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      setSteps((prev) => prev.map((s) =>
        s.status === 'running' ? { ...s, status: 'error' } : s
      ))
    }
  }

  const statusIcon = (status: ProgressStep['status']) => {
    if (status === 'done') return <span className="text-green-500">✓</span>
    if (status === 'running') return <span className="text-blue-500 animate-spin inline-block">⟳</span>
    if (status === 'error') return <span className="text-red-500">✕</span>
    return <span className="text-slate-300">○</span>
  }

  const statusColor = (status: ProgressStep['status']) => {
    if (status === 'done') return 'text-green-600'
    if (status === 'running') return 'text-blue-600'
    if (status === 'error') return 'text-red-600'
    return 'text-slate-400'
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Robot icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-4xl mb-5 shadow-[0_0_0_10px_#eff6ff]">
          🤖
        </div>

        <h1 className="text-xl font-bold mb-2">Drafting your estimate…</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          {photoFiles.length > 0 && `Analyzing ${photoFiles.length} photo${photoFiles.length > 1 ? 's' : ''} + `}
          your description
          {zipCode && ` · Factoring in zip ${zipCode} rates`}
        </p>

        {/* Progress steps */}
        <div className="text-left space-y-2.5">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 text-sm ${statusColor(s.status)}`}>
              {statusIcon(s.status)}
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            <p className="font-semibold mb-1">Something went wrong</p>
            <p className="mb-3">{error}</p>
            <button
              onClick={() => navigate('/estimates/wizard')}
              className="text-sm text-red-600 underline"
            >
              Start over
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Ensure `uploadAttachment` accepts video content types**

In `src/services/attachments.ts`, find the MIME type validation (the array of allowed types) and add video types:

```typescript
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
]
```

- [ ] **Step 3: Full wizard flow test in browser**

1. Click "New Estimate" from Dashboard → lands on Step 1
2. Skip client → Step 2 → enter zip → Step 3 → add 1-2 photos → Step 4 → type description → Step 5
3. Answer questions → click "Generate Estimate" → generating screen
4. Confirm progress steps animate, estimate opens in editor pre-populated
5. Check that AI badges appear on drafted line items
6. Check that range picker appears on unit price cells

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/wizard/WizardGenerating.tsx src/services/attachments.ts
rtk git commit -m "feat(wizard): WizardGenerating screen with estimate creation and AI draft orchestration"
```

---

## Task 12: Cleanup + Edge Cases

**Files:**
- Modify: `src/pages/NewEstimatePage.tsx` (keep for direct URL access / programmatic use)
- Verify `src/App.tsx` has both routes

- [ ] **Step 1: Verify both `/estimates/new` and `/estimates/wizard` still work**

`/estimates/new` should still work (it's used by any code that creates estimates programmatically). Wizard is the new UI entry point only.

- [ ] **Step 2: Handle wizard opened without org (edge case)**

In `EstimateWizardPage.tsx`, if `organizationId` is still null after the auth check (e.g., user has no org), show an error with a link to `/onboarding`.

Add after the useEffect:
```typescript
const organizationId = useWizardStore((s) => s.organizationId)

if (!organizationId && step !== 1) {
  // Still loading org — show spinner for first render
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading…</div>
    </div>
  )
}
```

- [ ] **Step 3: Run lint and type-check**

```bash
npm run lint
npm run type-check
```

Fix any TypeScript errors before proceeding.

- [ ] **Step 4: Run all tests**

```bash
rtk npx vitest run
```
Expected: all passing.

- [ ] **Step 5: Final commit**

```bash
rtk git add .
rtk git commit -m "feat(wizard): complete estimate creation wizard — 5-step flow with AI Q&A"
```

---

## Verification Checklist

- [ ] Dashboard "New Estimate" button navigates to `/estimates/wizard`
- [ ] Step 1: search existing clients, select, continue; OR create new client inline
- [ ] Step 1: skip works, advances to step 2 with no client set
- [ ] Step 2: ZIP code formats correctly (numeric only, 5 digit max)
- [ ] Step 2: Continue disabled until 5 valid digits; Skip works
- [ ] Step 3: add photos from library, remove photo, add video, max 10 photos
- [ ] Step 3: Continue always enabled (photos optional); Skip works
- [ ] Step 4: type in textarea; mic button appears in Chrome/Edge; Skip works
- [ ] Step 5 (chat mode): questions load from AI, answer + send advances to next question
- [ ] Step 5: "Skip question →" skips to next
- [ ] Step 5: "Show all" toggle reveals all questions as a form
- [ ] Step 5: "Generate Estimate →" button appears after all answered/skipped
- [ ] Generating screen: progress steps animate in order
- [ ] Generating: error state shows "Start over" link
- [ ] Editor opens with AI-drafted content + "Suggested by AI" badges
- [ ] Unit price cells show Low/Typical/High range picker
- [ ] `ai_usage_events` record created in DB after generation
- [ ] Back navigation works at every step
- [ ] Minimum path: skip all 5 steps → generate → editor (under 60 seconds)
