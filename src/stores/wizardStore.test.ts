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

  it('addPhotoFile ignores files beyond 10', () => {
    for (let i = 0; i < 11; i++) {
      act(() => useWizardStore.getState().addPhotoFile(
        new File([''], `photo-${i}.jpg`, { type: 'image/jpeg' })
      ))
    }
    expect(useWizardStore.getState().photoFiles).toHaveLength(10)
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
