import { useState } from 'react'
import { useParams } from 'react-router-dom'
import TopNav from '../components/layout/TopNav'
import EditorHeaderBar from '../components/estimate/EditorHeaderBar'
import OfflineBanner from '../components/estimate/OfflineBanner'
import ReadOnlyBanner from '../components/estimate/ReadOnlyBanner'
import StickyTotalsBar from '../components/estimate/StickyTotalsBar'
import EstimateBody from '../components/estimate/EstimateBody'
import SendEstimateModal from '../components/estimate/SendEstimateModal'
import { useEstimate } from '../hooks/useEstimate'
import { useAutosave } from '../hooks/useAutosave'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useEditorStore } from '../stores/editorStore'

export default function EstimateEditPage() {
  const { estimateId } = useParams<{ estimateId: string }>()
  const { loading, error } = useEstimate(estimateId)
  useAutosave()
  const online = useOnlineStatus()
  const readOnly = useEditorStore((s) => s.readOnly)
  const [sendOpen, setSendOpen] = useState(false)

  if (loading)
    return (
      <div className="min-h-screen">
        <TopNav />
        <div className="p-6 text-sm text-slate-500">Loading estimate...</div>
      </div>
    )
  if (error)
    return (
      <div className="min-h-screen">
        <TopNav />
        <div className="p-6 text-sm text-red-600">Error: {error}</div>
      </div>
    )

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <TopNav />
      <EditorHeaderBar onSendClick={() => setSendOpen(true)} />
      {!online && <OfflineBanner />}
      {readOnly && <ReadOnlyBanner />}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 pb-24">
        <EstimateBody />
      </main>
      <StickyTotalsBar />
      <SendEstimateModal open={sendOpen} onClose={() => setSendOpen(false)} />
    </div>
  )
}
