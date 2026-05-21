import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

type AvatarProps = {
  children: ReactNode
  className?: string
}

export function Avatar({ children, className }: AvatarProps) {
  return (
    <div className={cn('grid shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-200', className)}>
      {children}
    </div>
  )
}

type AvatarFallbackProps = {
  children: ReactNode
  className?: string
}

export function AvatarFallback({ children, className }: AvatarFallbackProps) {
  return <span className={cn('text-[10px] font-semibold text-neutral-700', className)}>{children}</span>
}
