function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener('seeked', handler)
      resolve()
    }
    video.addEventListener('seeked', handler)
    video.currentTime = time
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
    const url = URL.createObjectURL(blob)
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'metadata'
    video.src = url

    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve([])
    }

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration
        if (!isFinite(duration) || duration <= 0) {
          URL.revokeObjectURL(url)
          resolve([])
          return
        }

        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          resolve([])
          return
        }

        const frames: File[] = []
        for (let i = 0; i < frameCount; i++) {
          // Spread evenly: 0%, 25%, 50%, 75%, 100% for frameCount=5
          const time = frameCount === 1 ? duration / 2 : (i / (frameCount - 1)) * duration
          await seekTo(video, time)
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const frameBlob = await canvasToBlob(canvas)
          frames.push(new File([frameBlob], `frame-${i}.jpg`, { type: 'image/jpeg' }))
        }

        URL.revokeObjectURL(url)
        resolve(frames)
      } catch {
        URL.revokeObjectURL(url)
        resolve([])
      }
    }
  })
}
