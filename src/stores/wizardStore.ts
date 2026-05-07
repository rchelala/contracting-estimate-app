import { create } from 'zustand'

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 'generating'

export interface QAPair {
  question: string
  answer: string | null
}

export interface WizardState {
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
