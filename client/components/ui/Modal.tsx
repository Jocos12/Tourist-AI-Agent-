'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/design/cn'
import { focusRing } from '@/lib/design/tokens'
import { backdrop, scaleIn } from './motion'
import { useMounted } from './use-mounted'

type Size = 'sm' | 'md' | 'lg'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  /** Hide the default close (X) button — provide your own dismiss. */
  hideClose?: boolean
  size?: Size
  children: React.ReactNode
  className?: string
}

const SIZES: Record<Size, string> = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

/** Modal — centered glass dialog. Esc + backdrop close, scroll-locked, focus-managed. */
export function Modal({ open, onClose, title, hideClose, size = 'md', children, className }: ModalProps) {
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = title ? 'modal-title' : undefined

  // Esc to close + lock body scroll while open; restore focus on close.
  useEffect(() => {
    if (!open) return
    const prevFocus = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            variants={backdrop}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            variants={scaleIn(!!reduced)}
            initial="hidden"
            animate="show"
            exit="exit"
            className={cn('relative w-full glass rounded-2xl shadow-2xl shadow-black/40 outline-none', SIZES[size], className)}
          >
            {(title || !hideClose) && (
              <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3 border-b border-border/50">
                {title && <h2 id={titleId} className="font-display text-lg font-semibold text-text leading-tight">{title}</h2>}
                {!hideClose && (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className={cn('ml-auto p-1.5 rounded-lg text-text3 hover:text-gold hover:bg-gold/5 transition-colors', focusRing)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
