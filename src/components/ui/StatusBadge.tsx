import type { Database } from '../../types/database.types'

type EstimateStatus = Database['public']['Enums']['estimate_status']

const BADGE_CLASSES: Partial<Record<EstimateStatus, string>> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
}

const LABELS: Partial<Record<EstimateStatus, string>> = {
  draft: 'Draft',
  sent: 'Sent',
}

interface Props {
  status: EstimateStatus
}

export default function StatusBadge({ status }: Props) {
  const classes = BADGE_CLASSES[status] ?? 'bg-slate-100 text-slate-600'
  const label = LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
      {label}
    </span>
  )
}
