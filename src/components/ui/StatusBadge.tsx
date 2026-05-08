import type { Database } from '../../types/database.types'

type EstimateStatus = Database['public']['Enums']['estimate_status']

const BADGE_CLASSES: Partial<Record<EstimateStatus, string>> = {
  draft:    'bg-stone-100 text-stone-600',
  sent:     'bg-green-100 text-green-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  expired:  'bg-amber-100 text-amber-700',
  invoiced: 'bg-purple-100 text-purple-700',
}

const LABELS: Partial<Record<EstimateStatus, string>> = {
  draft:    'Draft',
  sent:     'Sent',
  approved: 'Approved',
  rejected: 'Rejected',
  expired:  'Expired',
  invoiced: 'Invoiced',
}

interface Props {
  status: EstimateStatus
}

export default function StatusBadge({ status }: Props) {
  const classes = BADGE_CLASSES[status] ?? 'bg-stone-100 text-stone-600'
  const label = LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
      {label}
    </span>
  )
}
