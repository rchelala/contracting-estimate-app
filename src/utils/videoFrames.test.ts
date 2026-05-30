import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractVideoFrames } from './videoFrames'

describe('extractVideoFrames', () => {
  let createElementSpy: any

  beforeEach(() => {
    const originalCreateElement = document.createElement.bind(document)
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'video') {
        // Trigger onerror asynchronously
        setTimeout(() => {
          const video = element as HTMLVideoElement
          if (video.onerror) {
            video.onerror(new Event('error') as any)
          }
        }, 0)
      }
      return element
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an empty array when video errors on load', async () => {
    const emptyBlob = new Blob([], { type: 'video/webm' })
    const frames = await extractVideoFrames(emptyBlob, 3)
    expect(frames).toEqual([])
  })

  it('calls URL.revokeObjectURL after error to prevent memory leaks', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const emptyBlob = new Blob([], { type: 'video/webm' })
    await extractVideoFrames(emptyBlob, 3)
    expect(revokeSpy).toHaveBeenCalled()
  })
})
