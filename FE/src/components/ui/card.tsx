import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '../utils/cn'

type CardProps = {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onClick()
  }

  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-neutral-200 bg-white shadow-[var(--shadow-soft)]',
        onClick && 'cursor-pointer transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2',
        className,
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
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
