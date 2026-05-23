import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

type ButtonVariant = 'default' | 'ghost' | 'secondary' | 'outline'
type ButtonSize = 'sm' | 'default' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
}

const buttonVariants: Record<ButtonVariant, string> = {
  default: 'bg-neutral-950 text-white hover:bg-neutral-900',
  ghost: 'bg-transparent text-neutral-950 hover:bg-neutral-100',
  secondary: 'bg-neutral-100 text-neutral-950 hover:bg-neutral-200',
  outline: 'border border-neutral-200 bg-transparent text-neutral-950 hover:bg-neutral-50',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  default: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
}

export function Button({ className, variant = 'default', size = 'default', asChild = false, ...props }: ButtonProps) {
  const Comp: any = asChild ? 'span' : 'button'
  return (
    <Comp
      type={asChild ? undefined : 'button'}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/30 disabled:pointer-events-none disabled:opacity-50',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  )
}
