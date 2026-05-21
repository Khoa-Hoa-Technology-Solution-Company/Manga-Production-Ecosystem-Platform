import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

type CardProps = {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return <div className={cn('rounded-3xl border border-neutral-200 bg-white', className)}>{children}</div>
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={cn('flex flex-col', className)}>{children}</div>
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn('', className)}>{children}</div>
}

export function CardTitle({ children, className }: CardProps) {
  return <h3 className={cn('text-base font-semibold tracking-tight text-neutral-950', className)}>{children}</h3>
}
