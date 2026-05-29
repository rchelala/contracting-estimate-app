// src/pages/EstimateWizardPage.tsx
import { useEffect, useState } from 'react'
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
  const [orgError, setOrgError] = useState<string | null>(null)

  useEffect(() => {
    reset()
    // Resolve organization ID once at mount
    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (!data.session) return navigate('/auth')
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', data.session.user.id)
          .single()
        if (membership) {
          setOrganizationId(membership.organization_id)
        } else {
          setOrgError('Your account is not linked to an organization. Please contact support or sign up again.')
        }
      })
      .catch(() => {
        setOrgError('Failed to load your account. Please refresh the page.')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (orgError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm font-semibold text-red-700 mb-1">Unable to start estimate</p>
          <p className="text-sm text-red-600 mb-4">{orgError}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-red-600 underline"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    )
  }

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
