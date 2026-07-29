import type { InputHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-[var(--radius-control)] border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 shadow-sm transition-[border-color,box-shadow] duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/20 focus-visible:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
