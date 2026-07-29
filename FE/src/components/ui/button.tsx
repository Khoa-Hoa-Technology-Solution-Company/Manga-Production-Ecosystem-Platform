import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

type ButtonVariant = 'default' | 'ghost' | 'secondary' | 'outline'
type ButtonSize = 'sm' | 'default' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const buttonVariants: Record<ButtonVariant, string> = {
  default: 'bg-neutral-950 text-white shadow-sm hover:bg-neutral-800 hover:shadow-md active:translate-y-px',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 active:translate-y-px',
  secondary: 'bg-neutral-100 text-neutral-950 hover:bg-neutral-200 active:translate-y-px',
  outline: 'border border-neutral-300 bg-transparent text-neutral-950 hover:bg-neutral-100 active:translate-y-px',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  default: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
}

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-pill)] font-medium transition-[background-color,color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/30 disabled:pointer-events-none disabled:opacity-50',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  )
}
