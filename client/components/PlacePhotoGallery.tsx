'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  urls: string[]
  alt: string
  /** Hero height class for main image */
  className?: string
}

export function PlacePhotoGallery({ urls, alt, className }: Props) {
  const [index, setIndex] = useState(0)
  const count = urls.length

  const go = useCallback(
    (delta: number) => {
      if (count <= 1) return
      setIndex((i) => (i + delta + count) % count)
    },
    [count],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  if (count === 0) return null

  return (
    <div className="space-y-2" role="region" aria-label={`${alt} photo gallery`}>
      <div className={`relative overflow-hidden rounded-xl bg-surface2 ${className ?? 'h-44'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={urls[index]}
          src={urls[index]}
          alt={`${alt} — photo ${index + 1} of ${count}`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
          role="tablist"
          aria-label="Photo thumbnails"
        >
          {urls.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                i === index ? 'border-gold' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
