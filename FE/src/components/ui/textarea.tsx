import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          className,
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'
