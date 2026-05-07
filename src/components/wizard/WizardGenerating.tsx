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

      if (resolvedClientId) {
        await updateEstimate(estimate.id, { client_id: resolvedClientId })
      }

      updateStep(0, 'done')

      // Step 2: Upload photos and video
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

      // Steps 3 & 4: AI drafting
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

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true
    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-4xl mb-5">
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
