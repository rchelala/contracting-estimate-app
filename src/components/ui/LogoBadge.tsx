// src/components/ui/LogoBadge.tsx
import { FileText } from '@phosphor-icons/react'

interface Props {
  size?: number
}

export default function LogoBadge({ size = 28 }: Props) {
  const iconSize = Math.round(size * 0.57)
  return (
    <div
      style={{ width: size, height: size }}
      className="bg-linear-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center shrink-0"
    >
      <FileText weight="fill" size={iconSize} color="white" />
    </div>
  )
}
