'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/design/cn'
import { slideIn } from './motion'
import { useMounted } from './use-mounted'

type Tone = 'info' | 'success' | 'danger'

interface ToastOptions {
  title: string
  description?: string
  tone?: Tone
  /** ms before auto-dismiss; 0 = sticky. Default 4000. */
  duration?: number
}

interface ToastItem extends Required<Omit<ToastOptions, 'description'>> {
  id: number
  description?: string
}

const ToastCtx = createContext<{ toast: (o: ToastOptions) => void } | null>(null)

/** useToast — `const { toast } = useToast(); toast({ title, tone })`. */
export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

const ICONS: Record<Tone, React.ReactNode> = {
  info: <Info className="w-4 h-4 text-text2" />,
  success: <CheckCircle2 className="w-4 h-4 text-green" />,
  danger: <AlertTriangle className="w-4 h-4 text-danger" />,
}

/** Wrap the app once; gives descendants `useToast()`. Renders a bottom-right stack. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), [])

  const toast = useCallback(
    ({ title, description, tone = 'info', duration = 4000 }: ToastOptions) => {
      const id = ++seq.current
      setItems((xs) => [...xs, { id, title, description, tone, duration }])
      if (duration > 0) setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(92vw,360px)]" role="region" aria-label="Notifications">
            <AnimatePresence initial={false}>
              {items.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  role="status"
                  variants={slideIn('right', !!reduced)}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="glass rounded-xl px-4 py-3 flex items-start gap-3 shadow-lg shadow-black/30"
                >
                  <span className="mt-0.5 shrink-0">{ICONS[t.tone]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text font-medium leading-snug">{t.title}</p>
                    {t.description && <p className="text-xs text-text2 mt-0.5 leading-relaxed">{t.description}</p>}
                  </div>
                  <button
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss"
                    className={cn('shrink-0 -mr-1 p-1 rounded-md text-text3 hover:text-text transition-colors')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </ToastCtx.Provider>
  )
}
