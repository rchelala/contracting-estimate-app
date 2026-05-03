import type { ButtonHTMLAttributes } from 'react'

interface Props {
  listeners?: Record<string, unknown>
  attributes?: Record<string, unknown>
  className?: string
}

export default function DragHandle({ listeners, attributes, className }: Props) {
  const listenerProps = listeners as ButtonHTMLAttributes<HTMLButtonElement> | undefined
  const attributeProps = attributes as ButtonHTMLAttributes<HTMLButtonElement> | undefined
  return (
    <button
      type="button"
      aria-label="Reorder"
      className={`text-slate-300 hover:text-slate-500 active:text-slate-700 cursor-grab active:cursor-grabbing min-h-[44px] w-5 flex items-center justify-center ${className ?? ''}`}
      {...attributeProps}
      {...listenerProps}
    >
      <span aria-hidden="true">≡</span>
    </button>
  )
}
