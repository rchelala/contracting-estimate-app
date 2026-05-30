function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener('seeked', handler)
      resolve()
    }
    video.addEventListener('seeked', handler)
    video.currentTime = time
    // Safety: resolve after 5s if seeked event never fires (jsdom, seek-to-same-position)
    setTimeout(() => {
      video.removeEventListener('seeked', handler)
      resolve()
    }, 5000)
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      0.85,
    )
  })
}

export async function extractVideoFrames(blob: Blob, frameCount = 5): Promise<File[]> {
  return new Promise((resolve) => {
    let settled = false
    const settle = (value: File[]) => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(url)
      resolve(value)
    }

    const url = URL.createObjectURL(blob)
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'metadata'
    video.src = url

    video.onerror = () => settle([])

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration
        if (!isFinite(duration) || duration <= 0) {
          settle([])
          return
        }

        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          settle([])
          return
        }

        const frames: File[] = []
        for (let i = 0; i < frameCount; i++) {
          const rawTime = frameCount === 1 ? duration / 2 : (i / (frameCount - 1)) * duration
          const time = Math.min(rawTime, duration - 0.001)
          await seekTo(video, time)
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const frameBlob = await canvasToBlob(canvas)
          frames.push(new File([frameBlob], `frame-${i}.jpg`, { type: 'image/jpeg' }))
        }

        settle(frames)
      } catch {
        settle([])
      }
    }
  })
}
