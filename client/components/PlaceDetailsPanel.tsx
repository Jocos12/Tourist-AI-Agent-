'use client'

import { useEffect, useState } from 'react'

interface PlaceData {
  name: string
  rating?: number
  ratingCount?: number
  priceSymbol?: string
  photoUrl?: string
  address?: string
  todayHours?: string
  summary?: string
  website?: string
  phone?: string
  mapsUri?: string
}

interface Props {
  placeId: string
  fallbackName: string
  fallbackMapsUrl: string
  onClose: () => void
}

const PRICE_SYMBOL: Record<string, string> = {
  FREE: 'Free',
  INEXPENSIVE: '$',
  MODERATE: '$$',
  EXPENSIVE: '$$$',
  VERY_EXPENSIVE: '$$$$',
}

// In-app place details — fetched from the Google Places API (New) via Maps JS by
// place_id, so the user sees the photo + details inside Hodari instead of being
// sent out to Google Maps.
export function PlaceDetailsPanel({ placeId, fallbackName, fallbackMapsUrl, onClose }: Props) {
  const [data, setData] = useState<PlaceData | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        await google.maps.importLibrary('places')
        const place = new google.maps.places.Place({ id: placeId })
        await place.fetchFields({
          fields: [
            'displayName', 'rating', 'userRatingCount', 'priceLevel', 'photos',
            'formattedAddress', 'regularOpeningHours', 'websiteURI',
            'googleMapsURI', 'nationalPhoneNumber', 'editorialSummary',
          ],
        })
        if (cancelled) return

        const hours = place.regularOpeningHours
        const todayIdx = (new Date().getDay() + 6) % 7 // JS Sunday=0 -> Places Monday=0
        setData({
          name: place.displayName ?? fallbackName,
          rating: place.rating ?? undefined,
          ratingCount: place.userRatingCount ?? undefined,
          priceSymbol: place.priceLevel ? PRICE_SYMBOL[place.priceLevel] : undefined,
          photoUrl: place.photos?.[0]?.getURI({ maxWidth: 720, maxHeight: 420 }),
          address: place.formattedAddress ?? undefined,
          todayHours: hours?.weekdayDescriptions?.[todayIdx],
          summary: place.editorialSummary ?? undefined,
          website: place.websiteURI ?? undefined,
          phone: place.nationalPhoneNumber ?? undefined,
          mapsUri: place.googleMapsURI ?? fallbackMapsUrl,
        })
        setStatus('ok')
      } catch (e) {
        console.error('Place details failed:', e)
        if (!cancelled) setStatus('error')
      }
    }

    if (typeof google !== 'undefined' && typeof google.maps?.importLibrary === 'function') load()
    else setStatus('error')
    return () => { cancelled = true }
  }, [placeId, fallbackName, fallbackMapsUrl])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-up" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md glass rounded-2xl overflow-hidden shadow-2xl shadow-black/40 max-h-[88vh] flex flex-col">
        {/* Photo / header */}
        <div className="relative h-44 shrink-0 bg-gradient-to-br from-gold/20 to-surface">
          {data?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.photoUrl} alt={data.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gold/40">
              <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" /></svg>
            </div>
          )}
          <button
            onClick={onClose}
            title="Close"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto scrollbar-hide">
          <h2 className="font-display text-xl font-semibold text-text leading-tight">
            {data?.name ?? fallbackName}
          </h2>

          {status === 'loading' && (
            <div className="flex items-center gap-2.5 mt-4">
              <div className="thinking-ring" />
              <span className="font-mono text-[11px] text-text3 tracking-widest">loading details…</span>
            </div>
          )}

          {status === 'error' && (
            <p className="text-[13px] text-text3 mt-3 leading-relaxed">
              Couldn&apos;t load live details (the Places API may not be enabled on the frontend key yet).
            </p>
          )}

          {status === 'ok' && data && (
            <>
              {/* Rating · price · open-now */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                {data.rating != null && (
                  <span className="flex items-center gap-1 text-[13px] text-text">
                    <span className="text-gold">★</span>{data.rating.toFixed(1)}
                    {data.ratingCount != null && <span className="text-text3">({data.ratingCount.toLocaleString()})</span>}
                  </span>
                )}
                {data.priceSymbol && <span className="text-[13px] text-green font-medium">{data.priceSymbol}</span>}
              </div>

              {data.summary && (
                <p className="text-[13.5px] text-text2 leading-relaxed mt-3">{data.summary}</p>
              )}

              {data.todayHours && (
                <p className="text-[12.5px] text-text3 mt-3 font-sans">{data.todayHours}</p>
              )}

              {data.address && (
                <div className="flex items-start gap-2 mt-3 text-text2">
                  <span className="text-gold/70 mt-0.5 shrink-0">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" /></svg>
                  </span>
                  <span className="text-[13px] leading-relaxed">{data.address}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border/40">
                {data.website && (
                  <a href={data.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[12px] text-text2 hover:text-gold border border-border hover:border-gold/40 rounded-full px-3 py-1.5 transition-all">
                    Website
                  </a>
                )}
                {data.phone && (
                  <a href={`tel:${data.phone}`}
                    className="flex items-center gap-1.5 text-[12px] text-text2 hover:text-gold border border-border hover:border-gold/40 rounded-full px-3 py-1.5 transition-all">
                    {data.phone}
                  </a>
                )}
                {data.mapsUri && (
                  <a href={data.mapsUri} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-text3 hover:text-gold ml-auto transition-colors font-mono tracking-wider uppercase">
                    Google Maps
                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM5 5h5V3H3v18h18v-7h-2v5H5V5z" /></svg>
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
