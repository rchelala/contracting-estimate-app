import { Sparkle } from '@phosphor-icons/react'

export default function AISuggestedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
      <Sparkle size={10} weight="fill" />
      AI Suggested
    </span>
  )
}
