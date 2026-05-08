import type { ButtonHTMLAttributes } from 'react'
import { DotsSixVertical } from '@phosphor-icons/react'

interface Props {
  listeners?: Record<string, unknown>
  attributes?: Record<string, unknown>
  className?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export default function DragHandle({ listeners, attributes, className, onClick }: Props) {
  const listenerProps = listeners as ButtonHTMLAttributes<HTMLButtonElement> | undefined
  const attributeProps = attributes as ButtonHTMLAttributes<HTMLButtonElement> | undefined
  return (
    <button
      type="button"
      aria-label="Reorder"
      className={`text-stone-300 hover:text-stone-500 active:text-stone-700 cursor-grab active:cursor-grabbing min-h-[44px] w-5 flex items-center justify-center ${className ?? ''}`}
      onClick={onClick}
      {...attributeProps}
      {...listenerProps}
    >
      <DotsSixVertical size={16} weight="bold" aria-hidden="true" />
    </button>
  )
}
