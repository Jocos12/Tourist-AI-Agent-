'use client'

import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { APIProvider, Map, Marker, useApiIsLoaded, useMap } from '@vis.gl/react-google-maps'
import { AlertCircle, ChevronLeft, ChevronDown, Loader2, MapPin, Maximize2, Minimize2, Star } from 'lucide-react'
import type { ItineraryStop, Place, Theme } from '@/lib/types'
import type { CustomRouteConfig, TravelMode } from '@/lib/mapActions'
import { travelModeToRoutesApi } from '@/lib/directions'
import {
  distanceKm,
  isValidCoord,
  shouldIncludeUserInBounds,
  type LatLng,
} from '@/lib/geo'
import { PlaceImage } from './PlaceImage'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
const ROUTE_ORANGE = '#F56A00'
const KIGALI_DEFAULT: LatLng = { lat: -1.9441, lng: 30.0619 }
const DEFAULT_ZOOM = 13

type FitPadding = number | { top: number; right: number; bottom: number; left: number }

interface ComputeRouteResult {
  distance: string
  duration: string
  polyline: string
}

async function fetchComputeRoute(
  origin: LatLng,
  destination: LatLng,
  travelMode: string,
): Promise<ComputeRouteResult | null> {
  try {
    const res = await fetch('/api/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, travelMode }),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function drawRoute(
  mapInstance: google.maps.Map,
  encodedPolyline: string,
  existingPolyline: MutableRefObject<google.maps.Polyline | null>,
  padding: FitPadding = { top: 40, right: 40, bottom: 40, left: 40 },
): google.maps.LatLngBounds | null {
  if (existingPolyline.current) {
    existingPolyline.current.setMap(null)
  }
  if (!google.maps.geometry?.encoding) return null

  const decodedPath = google.maps.geometry.encoding.decodePath(encodedPolyline)
  existingPolyline.current = new google.maps.Polyline({
    path: decodedPath,
    geodesic: true,
    strokeColor: ROUTE_ORANGE,
    strokeOpacity: 0.9,
    strokeWeight: 5,
    map: mapInstance,
  })

  const bounds = new google.maps.LatLngBounds()
  decodedPath.forEach((point) => bounds.extend(point))
  mapInstance.fitBounds(bounds, padding)
  return bounds
}

/** Standard light roadmap — no orange tint on land/water (orange only on route + pins). */
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

function boundsSpanKm(bounds: google.maps.LatLngBounds): number {
  const ne = bounds.getNorthEast()
  const sw = bounds.getSouthWest()
  return distanceKm({ lat: sw.lat(), lng: sw.lng() }, { lat: ne.lat(), lng: ne.lng() })
}

function clampZoomAfterFit(map: google.maps.Map, minZoom: number, maxZoom: number) {
  const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
    const z = map.getZoom()
    if (z == null) return
    if (z < minZoom) map.setZoom(minZoom)
    else if (z > maxZoom) map.setZoom(maxZoom)
  })
  return () => google.maps.event.removeListener(listener)
}

function fitMapPrecisely(
  map: google.maps.Map,
  markers: LatLng[],
  opts: {
    padding?: FitPadding
    minZoom?: number
    maxZoom?: number
    maxSpanKm?: number
    focus?: LatLng | null
    userLocation?: LatLng | null
    includeUser?: boolean
  } = {},
) {
  const valid = markers.filter(isValidCoord)
  if (valid.length === 0) return

  const minZoom = opts.minZoom ?? 15
  const maxZoom = opts.maxZoom ?? 17
  const maxSpanKm = opts.maxSpanKm ?? 32
  const padding = opts.padding ?? 48

  const fitUser =
    opts.includeUser &&
    opts.userLocation &&
    isValidCoord(opts.userLocation) &&
    shouldIncludeUserInBounds(opts.userLocation, valid)

  if (valid.length === 1 && !fitUser) {
    map.setCenter(valid[0])
    map.setZoom(maxZoom)
    return
  }

  const bounds = new google.maps.LatLngBounds()
  for (const m of valid) bounds.extend(m)
  if (fitUser && opts.userLocation) bounds.extend(opts.userLocation)

  const span = boundsSpanKm(bounds)
  if (span > maxSpanKm) {
    const focus =
      opts.focus && isValidCoord(opts.focus)
        ? opts.focus
        : fitUser && opts.userLocation
          ? opts.userLocation
          : valid[0]
    map.setCenter(focus)
    map.setZoom(minZoom)
    return
  }

  const pad =
    typeof padding === 'number'
      ? { top: padding, right: padding, bottom: padding, left: padding }
      : padding
  map.fitBounds(bounds, pad)
  clampZoomAfterFit(map, minZoom, maxZoom)
}

function userLocationIcon(): google.maps.Symbol | undefined {
  if (typeof google === 'undefined' || !google.maps?.SymbolPath) return undefined
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: '#4285F4',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 3,
  }
}

function stopMarkerIcon(index: number, isActive: boolean): google.maps.Symbol | undefined {
  if (typeof google === 'undefined' || !google.maps?.SymbolPath) return undefined
  const primary = index === 0 || isActive
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: primary ? 12 : 11,
    fillColor: primary ? ROUTE_ORANGE : '#ffffff',
    fillOpacity: 1,
    strokeColor: primary ? '#ffffff' : ROUTE_ORANGE,
    strokeWeight: primary ? 2.5 : 2.5,
  }
}

function stopMarkerLabel(index: number, isActive: boolean): google.maps.MarkerLabel | undefined {
  const primary = index === 0 || isActive
  return {
    text: String(index + 1),
    color: primary ? '#ffffff' : ROUTE_ORANGE,
    fontSize: '11px',
    fontWeight: '700',
  }
}

export type MapViewSize = 'compact' | 'full'

export interface RouteInfo {
  distance: string
  duration: string
  destinationName: string
  originLabel?: string
}

interface Props {
  places: Place[]
  itinerary: ItineraryStop[] | null
  activeStopIndex: number | null
  onMarkerClick: (index: number) => void
  userLocation: { lat: number; lng: number } | null
  theme: Theme
  showUserLocation?: boolean
  routeFromUser?: boolean
  customRoute?: CustomRouteConfig | null
  routeMode?: TravelMode
  onRouteInfo?: (info: RouteInfo | null) => void
  onRouteError?: (message: string | null) => void
  zoomFocusOnActive?: boolean
  size?: MapViewSize
  onExpand?: () => void
  onCollapse?: () => void
  selectedPlace?: Place | null
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  bottomSlot?: React.ReactNode
  hideInlinePlaceCard?: boolean
  onDirections?: () => void
  routeInfo?: RouteInfo | null
  /** Optional bar rendered above the map canvas (voice mode). */
  header?: ReactNode
}

function RoutePolyline({ stops }: { stops: ItineraryStop[] }) {
  const map = useMap()
  const polylinesRef = useRef<google.maps.Polyline[]>([])

  useEffect(() => {
    if (!map || stops.length < 2) return

    let cancelled = false

    polylinesRef.current.forEach((p) => p.setMap(null))
    polylinesRef.current = []

    const style = {
      geodesic: true,
      strokeColor: ROUTE_ORANGE,
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map,
    }

    void (async () => {
      for (let i = 1; i < stops.length; i++) {
        if (cancelled) return
        const enc = stops[i].travel_from_prev?.encoded_polyline
        if (enc && google.maps.geometry?.encoding) {
          const path = google.maps.geometry.encoding.decodePath(enc)
          polylinesRef.current.push(new google.maps.Polyline({ ...style, path }))
        } else {
          const origin = { lat: stops[i - 1].coordinates.lat, lng: stops[i - 1].coordinates.lng }
          const destination = { lat: stops[i].coordinates.lat, lng: stops[i].coordinates.lng }
          const result = await fetchComputeRoute(origin, destination, 'WALK')
          if (cancelled || !result?.polyline || !google.maps.geometry?.encoding) continue
          const path = google.maps.geometry.encoding.decodePath(result.polyline)
          polylinesRef.current.push(new google.maps.Polyline({ ...style, path }))
        }
      }
    })()

    return () => {
      cancelled = true
      polylinesRef.current.forEach((p) => p.setMap(null))
    }
  }, [map, stops])

  return null
}

function markerSetKey(markers: LatLng[], userLocation: LatLng | null, includeUser: boolean): string {
  const pts = markers.filter(isValidCoord).map((m) => `${m.lat.toFixed(5)},${m.lng.toFixed(5)}`).sort()
  const user =
    includeUser && userLocation && isValidCoord(userLocation)
      ? `${userLocation.lat.toFixed(5)},${userLocation.lng.toFixed(5)}`
      : ''
  return `${pts.join('|')}|u:${user}`
}

/** Center on place pins — not the user's GPS when results are in a different city. */
function PlacesMapCenter({ places }: { places: LatLng[] }) {
  const map = useMap()
  const placesKey = places.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|')

  useEffect(() => {
    if (!map || places.length === 0) return

    const valid = places.filter(isValidCoord)
    if (valid.length === 0) return

    const first = valid[0]
    map.setCenter(first)
    map.setZoom(15)

    if (valid.length > 1) {
      const bounds = new google.maps.LatLngBounds()
      valid.forEach((c) => bounds.extend(c))
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 })
    }
  }, [map, placesKey, places])

  return null
}

function PreciseMapFit({
  markers,
  userLocation,
  includeUser,
  focus,
  size,
}: {
  markers: LatLng[]
  userLocation: LatLng | null
  includeUser: boolean
  focus?: LatLng | null
  size: MapViewSize
}) {
  const map = useMap()
  const lastFitKey = useRef('')

  useEffect(() => {
    if (!map || markers.length === 0) return
    const valid = markers.filter(isValidCoord)
    if (valid.length === 0) return

    const fitKey = `${markerSetKey(valid, userLocation, includeUser)}|${size}`
    if (lastFitKey.current === fitKey) return
    lastFitKey.current = fitKey

    const isFull = size === 'full'
    fitMapPrecisely(map, valid, {
      padding: isFull
        ? { top: 96, right: 44, bottom: 220, left: 44 }
        : 36,
      minZoom: 15,
      maxZoom: isFull ? 17 : 18,
      maxSpanKm: isFull ? 28 : 32,
      focus,
      userLocation,
      includeUser,
    })
  }, [map, markers, userLocation, includeUser, focus?.lat, focus?.lng, size])

  return null
}

function MapZoomFocus({
  position,
  enabled,
  targetZoom = 16,
}: {
  position: LatLng | null
  enabled: boolean
  targetZoom?: number
}) {
  const map = useMap()
  const lastFocusKey = useRef('')

  useEffect(() => {
    if (!map || !enabled || !position || !isValidCoord(position)) {
      if (!enabled) lastFocusKey.current = ''
      return
    }
    const focusKey = `${position.lat.toFixed(5)},${position.lng.toFixed(5)}@${targetZoom}`
    if (lastFocusKey.current === focusKey) return
    lastFocusKey.current = focusKey
    map.setCenter(position)
    map.setZoom(targetZoom)
  }, [map, position?.lat, position?.lng, enabled, targetZoom])

  return null
}

const MAP_TYPE_OPTIONS = [
  { id: 'roadmap', label: 'Map' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'terrain', label: 'Terrain' },
] as const

function MapUiOptions({ fullControls }: { fullControls: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (!map || typeof google === 'undefined') return
    if (fullControls) {
      map.setOptions({
        zoomControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        mapTypeControl: false,
      })
    } else {
      map.setOptions({
        zoomControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
      })
    }
  }, [map, fullControls])

  return null
}

function MapTypeSelectControl() {
  const map = useMap()
  const containerRef = useRef<HTMLDivElement>(null)
  const [mapType, setMapType] = useState('roadmap')

  useEffect(() => {
    if (!map) return
    const current = map.getMapTypeId()
    if (current) setMapType(current)
  }, [map])

  useEffect(() => {
    if (!map || !containerRef.current || typeof google === 'undefined') return
    const position = google.maps.ControlPosition.TOP_LEFT
    const controls = map.controls[position]
    controls.push(containerRef.current)
    return () => {
      const el = containerRef.current
      if (!el) return
      const idx = controls.getArray().indexOf(el)
      if (idx >= 0) controls.removeAt(idx)
    }
  }, [map])

  return (
    <div ref={containerRef} className="relative ml-36 mt-3">
      <select
        value={mapType}
        onChange={(e) => {
          const next = e.target.value
          setMapType(next)
          map?.setMapTypeId(next)
        }}
        aria-label="Map type"
        className="cursor-pointer appearance-none rounded-full border border-gray-200 bg-white py-1.5 pl-3 pr-7 text-xs font-medium text-gray-700 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        {MAP_TYPE_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500"
        aria-hidden
      />
    </div>
  )
}

function OriginToPlaceRoute({
  origin,
  destination,
  destinationName,
  originLabel,
  mode,
  onRouteInfo,
  onRouteError,
}: {
  origin: LatLng | string
  destination: LatLng
  destinationName: string
  originLabel?: string
  mode: TravelMode
  onRouteInfo?: (info: RouteInfo | null) => void
  onRouteError?: (message: string | null) => void
}) {
  const map = useMap()
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const lastRouteFitKey = useRef('')
  const [resolvedOrigin, setResolvedOrigin] = useState<LatLng | null>(
    typeof origin === 'string' ? null : origin,
  )

  useEffect(() => {
    if (typeof origin !== 'string') {
      setResolvedOrigin(origin)
      return
    }
    setResolvedOrigin(null)
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ address: origin }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location
        setResolvedOrigin({ lat: loc.lat(), lng: loc.lng() })
      } else {
        onRouteError?.(`Could not find "${origin}" on the map.`)
      }
    })
  }, [origin, onRouteError])

  useEffect(() => {
    if (!map || !resolvedOrigin) return

    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }
    onRouteInfo?.(null)
    onRouteError?.(null)

    if (!isValidCoord(resolvedOrigin) || !isValidCoord(destination)) {
      onRouteError?.('Invalid map coordinates for this route.')
      return
    }

    let cancelled = false

    function finishError(primary: string) {
      if (cancelled) return
      onRouteError?.(
        `Could not draw route (${primary}). ` +
          'Enable Routes API on your Maps key, then retry.',
      )
    }

    void (async () => {
      const result = await fetchComputeRoute(
        resolvedOrigin,
        destination,
        travelModeToRoutesApi(mode),
      )
      if (cancelled) return
      if (!result?.polyline) {
        finishError('No route found')
        return
      }

      const bounds = drawRoute(map, result.polyline, polylineRef, {
        top: 96,
        right: 48,
        bottom: 240,
        left: 48,
      })

      onRouteInfo?.({
        distance: result.distance,
        duration: result.duration,
        destinationName,
        originLabel,
      })

      if (bounds && resolvedOrigin) {
        const routeKey = `${resolvedOrigin.lat.toFixed(5)},${resolvedOrigin.lng.toFixed(5)}|${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}|${mode}`
        if (lastRouteFitKey.current !== routeKey) {
          lastRouteFitKey.current = routeKey
          const span = boundsSpanKm(bounds)
          if (span > 40) {
            map.setCenter(destination)
            map.setZoom(15)
          } else {
            clampZoomAfterFit(map, 14, 17)
          }
        }
      }
    })()

    return () => {
      cancelled = true
      if (polylineRef.current) {
        polylineRef.current.setMap(null)
        polylineRef.current = null
      }
      onRouteInfo?.(null)
      onRouteError?.(null)
    }
  }, [
    map,
    resolvedOrigin?.lat,
    resolvedOrigin?.lng,
    destination.lat,
    destination.lng,
    destinationName,
    originLabel,
    mode,
    onRouteInfo,
    onRouteError,
  ])

  return null
}

type PlaceDetail = Place & { photos?: string[]; open?: boolean; price?: string }

function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function estimateWalkMin(km: number): number {
  return Math.max(1, Math.round((km / 5) * 60))
}

function MapPlaceholder({
  place,
  userLocation,
  empty = false,
  routeInfo,
  onDirections,
  className,
}: {
  place?: Place | null
  userLocation?: LatLng | null
  empty?: boolean
  routeInfo?: RouteInfo | null
  onDirections?: () => void
  className?: string
}) {
  const km =
    place?.coordinates && userLocation && isValidCoord(userLocation) && isValidCoord(place.coordinates)
      ? distanceKm(userLocation, place.coordinates)
      : null
  const distanceLabel = routeInfo?.distance ?? (km != null ? formatDistanceKm(km) : null)
  const durationLabel = routeInfo?.duration ?? (km != null ? `${estimateWalkMin(km)} min` : null)

  if (empty || !place) {
    return (
      <div
        className={`flex min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900/40 ${className ?? ''}`}
        style={{ minHeight: 200, width: '100%', position: 'relative' }}
      >
        <MapPin className="h-12 w-12 text-[#e07d3a]" strokeWidth={1.5} />
        <p className="text-[14px] font-medium text-[var(--text-primary)]">Ask me where to go</p>
        <p className="text-[12px] text-[var(--text-secondary)]">I&apos;ll show places on the map</p>
      </div>
    )
  }

  return (
    <div
      className={`flex min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-900/40 ${className ?? ''}`}
      style={{ minHeight: 200, width: '100%', position: 'relative' }}
    >
      <MapPin className="h-10 w-10 text-[#e07d3a]" strokeWidth={1.5} />
      <p className="text-[13px] font-semibold text-[var(--text-primary)]">{place.name}</p>
      <div className="flex flex-wrap items-center justify-center gap-3 text-[12px] text-[var(--text-secondary)]">
        {distanceLabel && <span>{distanceLabel}</span>}
        {durationLabel && <span>{durationLabel}</span>}
      </div>
      {onDirections && (
        <button
          type="button"
          onClick={onDirections}
          className="mt-2 rounded-lg bg-[#e07d3a] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#c96a2e]"
        >
          Directions
        </button>
      )}
    </div>
  )
}

function PlaceDetailBox({ place }: { place: PlaceDetail }) {
  return (
    <div className="mt-2 rounded-xl border border-amber-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      {place.photos && place.photos.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto">
          {place.photos.map((photo, i) => (
            <PlaceImage
              key={`${photo}-${i}`}
              place={{ ...place, photos: [photo] }}
              className="h-16 w-24 shrink-0 rounded-lg object-cover"
              width={192}
              height={128}
            />
          ))}
        </div>
      )}
      <p className="text-[13px] font-medium text-gray-900 dark:text-white">{place.name}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{place.address}</p>
      <div className="mt-1 flex items-center gap-2">
        {place.rating != null && (
          <span className="flex items-center gap-0.5 text-[11px] text-amber-600">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            {place.rating}
          </span>
        )}
        {(place.price ?? place.price_level) && (
          <span className="text-[11px] text-gray-400">{place.price ?? place.price_level}</span>
        )}
        {place.open != null && (
          <span className={`text-[11px] ${place.open ? 'text-green-600' : 'text-red-500'}`}>
            {place.open ? 'Open now' : 'Closed'}
          </span>
        )}
      </div>
    </div>
  )
}

function MapMarkers({
  markers,
  activeStopIndex,
  onMarkerClick,
  showUserLocation,
  userLocation,
  numberedStops,
}: {
  markers: (Place | ItineraryStop)[]
  activeStopIndex: number | null
  onMarkerClick: (index: number) => void
  showUserLocation: boolean
  userLocation: LatLng | null
  numberedStops: boolean
}) {
  const apiLoaded = useApiIsLoaded()

  return (
    <>
      {showUserLocation && userLocation && isValidCoord(userLocation) && (
        <Marker
          position={userLocation}
          title="Your location"
          zIndex={10}
          icon={apiLoaded ? userLocationIcon() : undefined}
        />
      )}

      {markers.map((item, i) => {
        const coords = 'coordinates' in item ? item.coordinates : (item as Place).coordinates
        const name = 'name' in item ? item.name : (item as Place).name
        const isActive = activeStopIndex === i

        return (
          <Marker
            key={`${('place_id' in item && item.place_id) ? item.place_id : 'm'}-${i}`}
            position={coords}
            title={name}
            zIndex={isActive ? 5 : 1}
            icon={apiLoaded ? stopMarkerIcon(i, isActive) : undefined}
            label={apiLoaded && numberedStops ? stopMarkerLabel(i, isActive) : undefined}
            onClick={() => onMarkerClick(i)}
          />
        )
      })}
    </>
  )
}

function MapCanvas({
  places,
  itinerary,
  activeStopIndex,
  onMarkerClick,
  userLocation,
  showUserLocation = true,
  routeFromUser = false,
  customRoute = null,
  routeMode = 'WALK',
  onRouteInfo,
  onRouteError,
  zoomFocusOnActive = false,
  size = 'full',
}: Omit<Props, 'onExpand' | 'onCollapse' | 'selectedPlace' | 'loading' | 'error' | 'onRetry' | 'bottomSlot'>) {
  const markers = itinerary ?? places
  const markerCoords = markers
    .map((m) => m.coordinates)
    .filter(isValidCoord)
  const firstPlace = markerCoords[0]
  const defaultCenter = firstPlace ?? KIGALI_DEFAULT
  const initialZoom = markerCoords.length > 0 ? 15 : DEFAULT_ZOOM
  const focusIndex = activeStopIndex ?? (markers.length > 0 ? 0 : null)
  const focusPos =
    focusIndex !== null && markers[focusIndex]
      ? markers[focusIndex].coordinates
      : null
  const isCompact = size === 'compact'
  const usePreciseFit = !zoomFocusOnActive && markerCoords.length > 0
  const useFocus =
    !!focusPos &&
    isValidCoord(focusPos) &&
    (zoomFocusOnActive || (isCompact && markerCoords.length === 1))
  const focusZoom = isCompact ? 17 : 16
  const numberedStops = (itinerary?.length ?? 0) >= 2

  const routeDestIndex = customRoute?.destinationIndex ?? activeStopIndex
  const routeDestination =
    routeDestIndex !== null && markers[routeDestIndex]
      ? markers[routeDestIndex]
      : null

  return (
    <APIProvider
      apiKey={API_KEY}
      libraries={['geometry', 'places']}
      onError={(err) => console.error('[map] Google Maps API failed to load', err)}
    >
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={markerCoords.length > 0 ? (isCompact ? 17 : initialZoom) : DEFAULT_ZOOM}
        className="h-full w-full"
        style={{ width: '100%', height: '100%', display: 'block' }}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl={!isCompact}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        styles={MAP_STYLES}
      >
        <MapUiOptions fullControls={size === 'full'} />
        {size === 'full' && <MapTypeSelectControl />}
        {markerCoords.length > 0 && <PlacesMapCenter places={markerCoords} />}
        {usePreciseFit && !useFocus && (
          <PreciseMapFit
            markers={markerCoords}
            userLocation={userLocation}
            includeUser={showUserLocation}
            focus={focusPos ?? null}
            size={size}
          />
        )}
        <MapZoomFocus position={focusPos ?? null} enabled={useFocus} targetZoom={focusZoom} />

        <MapMarkers
          markers={markers}
          activeStopIndex={activeStopIndex}
          onMarkerClick={onMarkerClick}
          showUserLocation={showUserLocation}
          userLocation={userLocation}
          numberedStops={numberedStops}
        />

        {itinerary && itinerary.length >= 2 && !routeFromUser && !customRoute && (
          <RoutePolyline stops={itinerary} />
        )}

        {routeFromUser &&
          userLocation &&
          isValidCoord(userLocation) &&
          routeDestination &&
          isValidCoord(routeDestination.coordinates) && (
          <OriginToPlaceRoute
            origin={userLocation}
            destination={routeDestination.coordinates}
            destinationName={routeDestination.name}
            originLabel="you"
            mode={routeMode}
            onRouteInfo={onRouteInfo}
            onRouteError={onRouteError}
          />
        )}

        {customRoute?.from === 'landmark' &&
          customRoute.landmark &&
          routeDestination &&
          isValidCoord(routeDestination.coordinates) && (
          <OriginToPlaceRoute
            origin={customRoute.landmark}
            destination={routeDestination.coordinates}
            destinationName={routeDestination.name}
            originLabel={customRoute.landmark.split(',')[0]}
            mode={customRoute.mode}
            onRouteInfo={onRouteInfo}
            onRouteError={onRouteError}
          />
        )}
      </Map>
    </APIProvider>
  )
}

export function MapView({
  size = 'full',
  onExpand,
  onCollapse,
  selectedPlace,
  loading = false,
  error = null,
  onRetry,
  bottomSlot,
  hideInlinePlaceCard = false,
  onDirections,
  routeInfo = null,
  header,
  ...canvasProps
}: Props) {
  const { places, itinerary } = canvasProps
  const hasData = (itinerary?.length ?? 0) > 0 || places.length > 0
  const fallbackPlace = selectedPlace ?? places[0] ?? itinerary?.[0] ?? null
  const compactPx = 220
  const mapHeight = size === 'compact' ? 'h-full min-h-[220px]' : 'h-full'
  const mapMinHeight = size === 'compact' ? compactPx : 200

  useEffect(() => {
    if (!API_KEY) {
      console.error('[map] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing')
    }
  }, [])

  if (loading) {
    return (
      <div className={`relative ${mapHeight} w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex ${mapHeight} w-full flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30`}>
        <AlertCircle className="h-6 w-6 text-red-500" />
        <p className="text-[13px] text-red-700 dark:text-red-400">Map unavailable</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="rounded-full border border-red-300 px-4 py-1.5 text-[13px] text-red-700 hover:bg-red-100">
            Retry
          </button>
        )}
      </div>
    )
  }

  if (!hasData) {
    return (
      <MapPlaceholder
        empty
        className={mapHeight}
      />
    )
  }

  if (!API_KEY) {
    console.error('[map] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing')
    return (
      <MapPlaceholder
        place={fallbackPlace as Place | null}
        userLocation={canvasProps.userLocation}
        routeInfo={routeInfo}
        onDirections={onDirections}
        className={mapHeight}
      />
    )
  }

  return (
    <div
      className={size === 'full' ? 'fixed inset-0 z-50 flex flex-col bg-bg' : 'relative h-full w-full'}
      style={size === 'compact' ? { width: '100%', height: '100%', minHeight: compactPx, display: 'block' } : undefined}
    >
      {size === 'full' && header}
      <div
        className={`relative ${size === 'full' ? 'min-h-0 flex-1' : mapHeight} w-full overflow-hidden ${size === 'compact' ? 'rounded-xl' : ''}`}
        style={size === 'compact' ? { width: '100%', height: '100%', minHeight: compactPx, display: 'block' } : { minHeight: size === 'full' ? 0 : mapMinHeight }}
      >
        {size === 'compact' && onExpand && (
          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand map"
            className="absolute right-2 top-2 z-10 rounded-full border border-gray-200 bg-white/95 p-1.5 shadow-md transition-colors hover:bg-amber-50 dark:border-slate-600 dark:bg-slate-900/95"
          >
            <Maximize2 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
          </button>
        )}
        {size === 'full' && onCollapse && (
          <>
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Open chat"
              className="absolute left-4 top-4 z-[60] flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-lg transition-all hover:bg-amber-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-amber-900/20"
            >
              <ChevronLeft size={16} />
              Open chat
            </button>
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Close map"
              className="absolute right-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-lg transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-900/95 dark:text-gray-200"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </>
        )}
        <div className="absolute inset-0">
          <MapCanvas {...canvasProps} size={size} />
        </div>
      </div>
      {size === 'compact' && selectedPlace && !hideInlinePlaceCard && <PlaceDetailBox place={selectedPlace} />}
      {size === 'full' && bottomSlot && (
        <div className="absolute bottom-0 left-0 right-0 z-[55] overflow-x-auto border-t border-gray-200 bg-white/95 p-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          {bottomSlot}
        </div>
      )}
    </div>
  )
}
