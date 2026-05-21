import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

type BadgeVariant = 'default' | 'secondary' | 'destructive'

type BadgeProps = {
  children: ReactNode
  className?: string
  variant?: BadgeVariant
}

const variants: Record<BadgeVariant, string> = {
  default: 'border-neutral-200 bg-white text-neutral-900',
  secondary: 'border-neutral-200 bg-neutral-100 text-neutral-900',
  destructive: 'border-red-200 bg-red-50 text-red-600',
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', variants[variant], className)}>{children}</span>
}
