import { describe, it, expect, vi } from 'vitest'
import { extractVideoFrames } from './useVideoFrameExtractor'

describe('extractVideoFrames', () => {
  it('returns an empty array when video metadata cannot load', async () => {
    // Mock createElement to create a video element that triggers onerror
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'video') {
        // Simulate error on video load
        setTimeout(() => {
          if (element.onerror) {
            element.onerror(new Event('error'))
          }
        }, 0)
      }
      return element
    })

    const emptyBlob = new Blob([], { type: 'video/webm' })
    const frames = await extractVideoFrames(emptyBlob, 3)
    expect(frames).toEqual([])
  })
})
