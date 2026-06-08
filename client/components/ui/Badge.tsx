import { cn } from '@/lib/design/cn'

type Tone = 'neutral' | 'gold' | 'success' | 'danger' | 'outline'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  /** DM Mono uppercase tag styling (the Hodari label look). */
  mono?: boolean
}

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface2 text-text2 border border-transparent',
  gold: 'bg-gold/10 text-gold border border-gold/25',
  success: 'bg-green/10 text-green border border-green/25',
  danger: 'bg-danger/10 text-danger border border-danger/25',
  outline: 'text-text2 border border-border',
}

/** Badge — small status pill; `mono` gives the uppercase matchday-tag look. */
export function Badge({ tone = 'neutral', mono, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 whitespace-nowrap',
        mono ? 'font-mono text-[10px] tracking-[0.12em] uppercase' : 'font-sans text-xs font-medium',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}
