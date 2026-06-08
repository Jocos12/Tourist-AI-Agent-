'use client'

import { useState } from 'react'
import { cn } from '@/lib/design/cn'

type Size = 'sm' | 'md' | 'lg'

export interface AvatarProps {
  src?: string | null
  /** Used for the alt text and the initials fallback. */
  name: string
  size?: Size
  /** Presence dot: green = online, muted = away/offline. */
  status?: 'online' | 'offline'
  className?: string
}

const SIZES: Record<Size, string> = { sm: 'w-7 h-7 text-[11px]', md: 'w-9 h-9 text-xs', lg: 'w-12 h-12 text-sm' }
const DOT: Record<Size, string> = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' }

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/** Avatar — image with graceful initials fallback and an optional presence dot. */
export function Avatar({ src, name, size = 'md', status, className }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const showImg = src && !failed

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full overflow-hidden',
          'bg-surface2 border border-border text-text2 font-mono font-medium uppercase',
          SIZES[size],
        )}
      >
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
        ) : (
          <span aria-hidden>{initials(name) || '?'}</span>
        )}
      </span>
      {status && (
        <span
          aria-label={status === 'online' ? 'Online' : 'Offline'}
          className={cn(
            'absolute -bottom-0 -right-0 rounded-full ring-2 ring-bg',
            DOT[size],
            status === 'online' ? 'bg-green' : 'bg-text3',
          )}
        />
      )}
    </span>
  )
}
