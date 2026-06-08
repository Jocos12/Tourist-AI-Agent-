'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdvancedMarker, APIProvider, InfoWindow, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import type { ItineraryStop, Place } from '@/lib/types'

const DEFAULT_STADIUM = { lat: 40.8136, lng: -74.0745 }

interface Props {
  places: Place[]
  itinerary: ItineraryStop[] | null
  activeStopIndex: number | null
  onMarkerClick: (index: number | null) => void
  userLocation: { lat: number; lng: number } | null
  locating: boolean
  locationFallbackUsed: boolean
  onLocateMe: () => void
  onClose: () => void
  onExpand?: () => void
  onCollapse?: () => void
  isExpanded?: boolean
  onFeedback?: (stopIndex: number, action: 'liked' | 'disliked') => void
  onSwap?: (stopIndex: number) => void
  totalCostEstimate?: number
}

interface StopMetrics {
  distance: string
  duration: string
  label: string
  arrivalTime?: string
  distanceValue: number
  durationValue: number
}

interface ResolvedStop extends ItineraryStop {
  maps_url?: string
  resolved_place_id?: string
}

export function MapView({
  places,
  itinerary,
  activeStopIndex,
  onMarkerClick,
  userLocation,
  locating,
  locationFallbackUsed,
  onLocateMe,
  onClose,
  onExpand,
  onCollapse,
  isExpanded = false,
  onFeedback,
  onSwap,
  totalCostEstimate,
}: Props) {
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

  const requestedStops = useMemo<ItineraryStop[]>(() => {
    if (itinerary?.length) return itinerary

    return places.map((place) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.address,
      coordinates: place.coordinates,
      rationale: place.summary ?? 'Suggested because it matches your request.',
    }))
  }, [itinerary, places])

  const [resolvedStops, setResolvedStops] = useState<ResolvedStop[]>(requestedStops)
  const [stopMetrics, setStopMetrics] = useState<Record<string, StopMetrics>>({})
  const [routeTotal, setRouteTotal] = useState<StopMetrics | null>(null)
  const defaultCenter = userLocation ?? resolvedStops[0]?.coordinates ?? DEFAULT_STADIUM
  const activeStop = activeStopIndex !== null ? resolvedStops[activeStopIndex] : null
  const summary = routeTotal ?? summarizeMetrics(Object.values(stopMetrics))
  const cost = typeof totalCostEstimate === 'number' ? `$${Math.round(totalCostEstimate)}` : 'TBD'

  const handleResolvedStops = useCallback((stops: ResolvedStop[]) => {
    setResolvedStops(stops)
  }, [])

  const handleMetrics = useCallback((metrics: Record<string, StopMetrics>, total?: StopMetrics | null) => {
    setStopMetrics((prev) => {
      const merged = { ...prev }
      for (const [key, metric] of Object.entries(metrics)) {
        merged[key] = {
          ...metric,
          arrivalTime: metric.arrivalTime ?? prev[key]?.arrivalTime,
        }
      }
      return merged
    })
    if (total !== undefined) setRouteTotal(total)
  }, [])

  return (
    <div className={`flex h-full flex-col overflow-hidden bg-[#FDF8F0] dark:bg-[#1A1612] ${
      isExpanded ? '' : 'rounded-[2rem] border border-amber-100 shadow-2xl shadow-navy/10 dark:border-gray-800'
    }`}>
      <div className="flex items-center justify-between border-b border-amber-100 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">🗺 Map View</span>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <button
              type="button"
              onClick={onExpand}
              className="rounded-full border border-amber-300 px-3 py-1 text-xs text-amber-600 transition-all hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/30"
            >
              ⛶ Expand
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-amber-300 px-3 py-1 text-xs text-amber-600 transition-all hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/30"
          >
            Close
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <APIProvider apiKey={mapsApiKey} libraries={['places']}>
          <Map
            defaultCenter={defaultCenter}
            defaultZoom={resolvedStops.length > 0 ? 14 : 13}
            mapId="hodari-map"
            className="h-full w-full"
            gestureHandling="greedy"
            disableDefaultUI
          >
            <PlacesResolver sourceStops={requestedStops} userLocation={userLocation} onResolved={handleResolvedStops} />

            {userLocation && (
              <AdvancedMarker
                position={userLocation}
                title={locationFallbackUsed ? 'Fallback stadium location' : 'Your location'}
                zIndex={20}
              >
                <div className="relative h-5 w-5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/35" />
                  <span className="absolute inset-1 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
                </div>
              </AdvancedMarker>
            )}

            {resolvedStops.map((stop, index) => {
              const active = activeStopIndex === index
              return (
                <AdvancedMarker
                  key={`${stop.place_id}-${index}`}
                  position={stop.coordinates}
                  title={stop.name}
                  zIndex={active ? 15 : 10}
                  onClick={() => onMarkerClick(index)}
                >
                  <button
                    type="button"
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#F59E0B] text-sm font-bold text-white shadow-xl transition ${
                      active ? 'scale-110' : 'hover:scale-105'
                    }`}
                  >
                    {index + 1}
                  </button>
                </AdvancedMarker>
              )
            })}

            {activeStop && (
              <InfoWindow
                position={activeStop.coordinates}
                onCloseClick={() => onMarkerClick(null)}
              >
                <div className="max-w-[220px] text-sm text-text">
                  <p className="font-semibold">{activeStop.name}</p>
                  <p className="mt-1 text-xs text-text2">{activeStop.address}</p>
                  <a
                    href={buildDirectionsUrl(userLocation, activeStop)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-xs font-semibold text-gold"
                  >
                    Open walking directions
                  </a>
                </div>
              </InfoWindow>
            )}

            <RouteLayer
              userLocation={userLocation}
              stops={resolvedStops}
              activeStopIndex={activeStopIndex}
              onMetrics={handleMetrics}
            />
            <ZoomControls userLocation={userLocation} onLocateMe={onLocateMe} />
          </Map>
        </APIProvider>

        {isExpanded && (
          <button
            type="button"
            onClick={onCollapse}
            className="absolute left-4 top-4 z-50 rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 shadow-lg transition-all hover:bg-amber-50 dark:border-amber-600 dark:bg-gray-900 dark:text-amber-300 dark:hover:bg-amber-900/30"
          >
            ← Back to chat
          </button>
        )}

        {locating && (
          <div className="absolute left-16 top-4 z-20 flex items-center gap-2 rounded-full border border-border bg-white/95 px-3 py-2 text-sm text-text2 shadow-lg backdrop-blur">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            locating you...
          </div>
        )}

        {locationFallbackUsed && !locating && (
          <div className="absolute left-16 top-4 z-20 rounded-full border border-border bg-white/95 px-3 py-2 text-xs text-text2 shadow-lg backdrop-blur">
            Location denied, using nearest default stadium.
          </div>
        )}
      </div>

      <div className="border-t border-amber-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
          {resolvedStops.map((stop, index) => {
            const metric = stopMetrics[metricKey(stop, index)]
            const active = activeStopIndex === index
            return (
              <div
                key={`${stop.place_id}-card-${index}`}
                role="button"
                tabIndex={0}
                onClick={() => onMarkerClick(index)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onMarkerClick(index)
                  }
                }}
                className={`w-56 flex-shrink-0 cursor-pointer rounded-xl border bg-[#FDF8F0] p-3 text-left transition hover:-translate-y-0.5 dark:bg-gray-800 ${
                  active ? 'border-amber-300 ring-2 ring-amber-400/15 dark:border-amber-700' : 'border-amber-100 hover:border-amber-300 dark:border-gray-700 dark:hover:border-amber-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400">Stop {index + 1}</p>
                    <p className="mt-1 truncate text-sm font-medium text-gray-900 dark:text-white">{stop.name}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {metric?.duration ?? '...'}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{stop.address}</p>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{metric?.label ?? 'calculating route...'}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{metric?.arrivalTime ?? stop.arrival_time ?? 'arrival soon'}</p>
                <div className="mt-2 flex items-center gap-2">
                  <SmallAction label="Like" onClick={(event) => { event.stopPropagation(); onFeedback?.(index, 'liked') }}>Like</SmallAction>
                  <SmallAction label="Dislike" onClick={(event) => { event.stopPropagation(); onFeedback?.(index, 'disliked') }}>No</SmallAction>
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); window.open(buildDirectionsUrl(userLocation, stop), '_blank', 'noopener,noreferrer') }}
                    className="ml-auto text-xs font-medium text-amber-600 dark:text-amber-400"
                  >
                    Directions
                  </button>
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); onSwap?.(index) }}
                    className="text-xs font-medium text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400"
                  >
                    Swap
                  </button>
                </div>
              </div>
            )
          })}

          <div className="flex w-48 flex-shrink-0 flex-col justify-center rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="mb-2 text-xs font-semibold uppercase text-amber-700 dark:text-amber-400">Summary</p>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
              <p>📍 {summary?.distance ?? 'TBD'}</p>
              <p>⏱ {summary?.duration ?? 'TBD'}</p>
              <p className="mt-1 font-semibold text-amber-700 dark:text-amber-400">💰 {cost}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlacesResolver({
  sourceStops,
  userLocation,
  onResolved,
}: {
  sourceStops: ItineraryStop[]
  userLocation: { lat: number; lng: number } | null
  onResolved: (stops: ResolvedStop[]) => void
}) {
  const map = useMap()
  const placesLib = useMapsLibrary('places')

  useEffect(() => {
    if (!map || !placesLib || sourceStops.length === 0) {
      onResolved(sourceStops)
      return
    }

    let cancelled = false
    const service = new placesLib.PlacesService(map)

    Promise.all(sourceStops.map((stop) => resolvePlace(service, stop, userLocation))).then((stops) => {
      if (!cancelled) onResolved(stops)
    })

    return () => {
      cancelled = true
    }
  }, [map, onResolved, placesLib, sourceStops, userLocation])

  return null
}

function RouteLayer({
  userLocation,
  stops,
  activeStopIndex,
  onMetrics,
}: {
  userLocation: { lat: number; lng: number } | null
  stops: ResolvedStop[]
  activeStopIndex: number | null
  onMetrics: (metrics: Record<string, StopMetrics>, total?: StopMetrics | null) => void
}) {
  const map = useMap()
  const polylinesRef = useRef<google.maps.Polyline[]>([])

  useEffect(() => {
    if (map && activeStopIndex !== null && activeStopIndex >= 0) {
      const stop = stops[activeStopIndex]
      if (stop) {
        map.panTo(stop.coordinates)
        map.setZoom(Math.max(map.getZoom() ?? 15, 15))
      }
    }
  }, [activeStopIndex, map, stops])

  useEffect(() => {
    polylinesRef.current.forEach((polyline) => polyline.setMap(null))
    polylinesRef.current = []

    if (!map || !userLocation || stops.length === 0 || typeof google === 'undefined') {
      onMetrics({}, null)
      return
    }

    let cancelled = false
    const service = new google.maps.DirectionsService()
    const bounds = new google.maps.LatLngBounds()
    bounds.extend(userLocation)
    stops.forEach((stop) => bounds.extend(stop.coordinates))
    map.fitBounds(bounds, 72)

    service.route(
      {
        origin: userLocation,
        destination: stops[stops.length - 1].coordinates,
        waypoints: stops.slice(0, -1).map((stop) => ({ location: stop.coordinates, stopover: true })),
        travelMode: google.maps.TravelMode.WALKING,
        optimizeWaypoints: false,
      },
      (result, status) => {
        if (cancelled || status !== 'OK' || !result?.routes[0]) return

        const route = result.routes[0]
        polylinesRef.current.push(
          new google.maps.Polyline({
            map,
            path: route.overview_path,
            geodesic: true,
            strokeColor: '#F59E0B',
            strokeOpacity: 0,
            strokeWeight: 4,
            icons: [
              {
                icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                offset: '0',
                repeat: '16px',
              },
            ],
          }),
        )

        const totalMeters = route.legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0)
        const totalSeconds = route.legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0)
        onMetrics(buildLegArrivalMetrics(stops, route.legs), makeMetric(totalMeters, totalSeconds))
      },
    )

    Promise.all(
      stops.map(
        (stop, index) =>
          new Promise<[string, StopMetrics]>((resolve) => {
            service.route(
              {
                origin: userLocation,
                destination: stop.coordinates,
                travelMode: google.maps.TravelMode.WALKING,
              },
              (result, status) => {
                const leg = status === 'OK' ? result?.routes[0]?.legs[0] : undefined
                const meters = leg?.distance?.value ?? haversineMeters(userLocation, stop.coordinates)
                const seconds = leg?.duration?.value ?? Math.round((meters / 75) * 60)
                resolve([metricKey(stop, index), makeMetric(meters, seconds, leg?.distance?.text, leg?.duration?.text)])
              },
            )
          }),
      ),
    ).then((entries) => {
      if (!cancelled) {
        onMetrics(Object.fromEntries(entries))
      }
    })

    return () => {
      cancelled = true
      polylinesRef.current.forEach((polyline) => polyline.setMap(null))
      polylinesRef.current = []
    }
  }, [map, onMetrics, stops, userLocation])

  return null
}

function ZoomControls({ userLocation, onLocateMe }: { userLocation: { lat: number; lng: number } | null; onLocateMe: () => void }) {
  const map = useMap()

  return (
    <div className="absolute right-4 top-4 z-20 flex flex-col overflow-hidden rounded-2xl border border-border bg-white/95 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={() => map?.setZoom((map.getZoom() ?? 13) + 1)}
        className="flex h-10 w-10 items-center justify-center border-b border-border text-lg font-semibold text-text hover:bg-[#FEF3C7]"
        title="Zoom in"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => map?.setZoom((map.getZoom() ?? 13) - 1)}
        className="flex h-10 w-10 items-center justify-center border-b border-border text-xl font-semibold text-text hover:bg-[#FEF3C7]"
        title="Zoom out"
      >
        -
      </button>
      <button
        type="button"
        onClick={() => {
          if (userLocation) map?.panTo(userLocation)
          onLocateMe()
        }}
        className="flex h-10 w-10 items-center justify-center text-text2 hover:bg-[#FEF3C7] hover:text-gold"
        title="Center on me"
        aria-label="Center on me"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
    </div>
  )
}

function SmallAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="text-xs font-medium text-gray-600 hover:text-amber-600 dark:text-gray-300 dark:hover:text-amber-400"
    >
      {children}
    </button>
  )
}

function resolvePlace(
  service: google.maps.places.PlacesService,
  stop: ItineraryStop,
  userLocation: { lat: number; lng: number } | null,
): Promise<ResolvedStop> {
  return new Promise((resolve) => {
    const query = [stop.name, stop.address].filter(Boolean).join(' ')
    service.findPlaceFromQuery(
      {
        query,
        fields: ['name', 'place_id', 'formatted_address', 'geometry'],
        locationBias: userLocation ? new google.maps.LatLng(userLocation.lat, userLocation.lng) : undefined,
      },
      (results, status) => {
        const place = status === google.maps.places.PlacesServiceStatus.OK ? results?.[0] : undefined
        const location = place?.geometry?.location

        if (!place || !location) {
          resolve({ ...stop, maps_url: buildDirectionsUrl(userLocation, stop) })
          return
        }

        const resolved: ResolvedStop = {
          ...stop,
          place_id: place.place_id ?? stop.place_id,
          resolved_place_id: place.place_id,
          name: place.name ?? stop.name,
          address: place.formatted_address ?? stop.address,
          coordinates: { lat: location.lat(), lng: location.lng() },
        }
        resolve({ ...resolved, maps_url: buildDirectionsUrl(userLocation, resolved) })
      },
    )
  })
}

function buildLegArrivalMetrics(stops: ResolvedStop[], legs: google.maps.DirectionsLeg[]): Record<string, StopMetrics> {
  const now = Date.now()
  let cumulativeSeconds = 0

  return Object.fromEntries(
    stops.map((stop, index) => {
      const leg = legs[index]
      cumulativeSeconds += leg?.duration?.value ?? 0
      const meters = leg?.distance?.value ?? 0
      const seconds = leg?.duration?.value ?? 0
      return [
        metricKey(stop, index),
        makeMetric(
          meters,
          seconds,
          leg?.distance?.text,
          leg?.duration?.text,
          formatArrival(now + cumulativeSeconds * 1000),
        ),
      ]
    }),
  )
}

function summarizeMetrics(metrics: StopMetrics[]): StopMetrics | null {
  if (!metrics.length) return null
  const distanceValue = metrics.reduce((sum, metric) => sum + metric.distanceValue, 0)
  const durationValue = metrics.reduce((sum, metric) => sum + metric.durationValue, 0)
  return makeMetric(distanceValue, durationValue)
}

function makeMetric(distanceValue: number, durationValue: number, distance?: string, duration?: string, arrivalTime?: string): StopMetrics {
  const formattedDistance = distance ?? formatMeters(distanceValue)
  const formattedDuration = duration ?? formatSeconds(durationValue)
  return {
    distance: formattedDistance,
    duration: formattedDuration,
    label: `${formattedDistance} · ${formattedDuration} walk`,
    arrivalTime,
    distanceValue,
    durationValue,
  }
}

function metricKey(stop: Pick<ItineraryStop, 'place_id' | 'name'>, index: number): string {
  return `${stop.place_id || stop.name}-${index}`
}

function buildDirectionsUrl(userLocation: { lat: number; lng: number } | null, stop: Pick<ResolvedStop, 'name' | 'coordinates' | 'resolved_place_id'>): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${stop.coordinates.lat},${stop.coordinates.lng}`,
    travelmode: 'walking',
  })

  if (userLocation) params.set('origin', `${userLocation.lat},${userLocation.lng}`)
  if (stop.resolved_place_id) {
    params.set('destination', stop.name)
    params.set('destination_place_id', stop.resolved_place_id)
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function formatMeters(value: number): string {
  if (value < 1000) return `${Math.round(value)} m`
  return `${(value / 1000).toFixed(1)} km`
}

function formatSeconds(value: number): string {
  const mins = Math.max(1, Math.round(value / 60))
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function formatArrival(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp))
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const radius = 6_371_000
  const phi1 = toRad(a.lat)
  const phi2 = toRad(b.lat)
  const dPhi = toRad(b.lat - a.lat)
  const dLambda = toRad(b.lng - a.lng)
  const h = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function toRad(value: number): number {
  return (value * Math.PI) / 180
}
