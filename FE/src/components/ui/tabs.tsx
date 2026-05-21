import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

type TabItem = {
  key: string
  label: string
  icon?: ReactNode
  count?: number
}

type TabsProps = {
  tabs: TabItem[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1', className)}>
      {tabs.map(({ key, label, icon, count }) => (
        <button
          key={key}
          type="button"
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            active === key
              ? 'bg-white text-neutral-950 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          )}
          onClick={() => onChange(key)}
        >
          {icon}
          {label}
          {count !== undefined && (
            <span className={cn(
              'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              active === key ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-600'
            )}>
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
