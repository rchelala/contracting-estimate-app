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
