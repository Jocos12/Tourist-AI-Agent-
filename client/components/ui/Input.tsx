'use client'

import { forwardRef, useId } from 'react'
import { cn } from '@/lib/design/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: React.ReactNode
}

/** Input — labelled text field matching the composer style, with hint/error states. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, id, className, disabled, ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const descId = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block font-mono text-[10px] text-text3 tracking-widest uppercase mb-1.5">
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl px-3.5 bg-surface/80 border transition-colors',
          'focus-within:ring-2 focus-within:ring-gold/30 focus-within:border-gold/40',
          error ? 'border-danger/50' : 'border-border',
          disabled && 'opacity-50',
        )}
      >
        {leftIcon && <span className="text-text3 shrink-0">{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={descId}
          className={cn('flex-1 bg-transparent py-2.5 text-sm text-text placeholder-text3 outline-none font-sans', className)}
          {...props}
        />
      </div>
      {error ? (
        <p id={descId} className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={descId} className="mt-1.5 text-xs text-text3">{hint}</p>
      ) : null}
    </div>
  )
})
