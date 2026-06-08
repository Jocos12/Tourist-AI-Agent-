'use client'

import { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/design/cn'
import { focusRing } from '@/lib/design/tokens'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
}

/** Select — styled native `<select>` (keeps OS accessibility) with a chevron. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, id, className, disabled, children, ...props },
  ref,
) {
  const autoId = useId()
  const selectId = id ?? autoId
  const descId = error ? `${selectId}-err` : hint ? `${selectId}-hint` : undefined

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block font-mono text-[10px] text-text3 tracking-widest uppercase mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={descId}
          className={cn(
            'w-full appearance-none rounded-xl bg-surface/80 border text-sm text-text font-sans',
            'pl-3.5 pr-9 py-2.5 transition-colors disabled:opacity-50 cursor-pointer',
            error ? 'border-danger/50' : 'border-border hover:border-gold/40',
            focusRing,
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="w-4 h-4 text-text3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
      </div>
      {error ? (
        <p id={descId} className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={descId} className="mt-1.5 text-xs text-text3">{hint}</p>
      ) : null}
    </div>
  )
})
