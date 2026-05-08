import { Lock } from '@phosphor-icons/react'

export default function ReadOnlyBanner() {
  return (
    <div className="bg-stone-100 border-b border-stone-200 text-stone-500 text-sm h-10 flex items-center gap-2 px-6">
      <Lock size={14} weight="fill" />
      This estimate has been marked as sent and is now read-only.
    </div>
  )
}
