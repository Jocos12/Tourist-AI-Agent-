'use client'

import { useEffect, useRef, useState } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps'
import type { ItineraryStop, Place, Theme } from '@/lib/types'
import type { CustomRouteConfig, TravelMode } from '@/lib/mapActions'
import { defaultMapCenter, isValidCoord, type LatLng } from '@/lib/geo'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

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
  /** Draw a route from the user's GPS to the active pin. */
  routeFromUser?: boolean
  /** Draw a route from a landmark (geocoded) to the active pin. */
  customRoute?: CustomRouteConfig | null
  routeMode?: TravelMode
  onRouteInfo?: (info: RouteInfo | null) => void
  onRouteError?: (message: string | null) => void
  zoomFocusOnActive?: boolean
}

function RoutePolyline({ stops }: { stops: ItineraryStop[] }) {
  const map = useMap()
  const polylinesRef = useRef<google.maps.Polyline[]>([])
  const directionsRenderersRef = useRef<google.maps.DirectionsRenderer[]>([])

  useEffect(() => {
    if (!map || stops.length < 2) return

    polylinesRef.current.forEach(p => p.setMap(null))
    polylinesRef.current = []
    directionsRenderersRef.current.forEach(r => r.setMap(null))
    directionsRenderersRef.current = []

    const style = {
      geodesic: true,
      strokeColor: '#F56A00',
      strokeOpacity: 0.85,
      strokeWeight: 3,
      map,
    }

    const directionsService = new google.maps.DirectionsService()

    for (let i = 1; i < stops.length; i++) {
      const enc = stops[i].travel_from_prev?.encoded_polyline
      if (enc && google.maps.geometry?.encoding) {
        const path = google.maps.geometry.encoding.decodePath(enc)
        polylinesRef.current.push(new google.maps.Polyline({ ...style, path }))
      } else {
        const origin = { lat: stops[i - 1].coordinates.lat, lng: stops[i - 1].coordinates.lng }
        const destination = { lat: stops[i].coordinates.lat, lng: stops[i].coordinates.lng }
        const renderer = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          polylineOptions: { strokeColor: '#F56A00', strokeOpacity: 0.85, strokeWeight: 3 },
        })
        directionsRenderersRef.current.push(renderer)
        directionsService.route(
          { origin, destination, travelMode: google.maps.TravelMode.WALKING },
          (result, status) => {
            if (status === 'OK' && result) renderer.setDirections(result)
          },
        )
      }
    }

    return () => {
      polylinesRef.current.forEach(p => p.setMap(null))
      directionsRenderersRef.current.forEach(r => r.setMap(null))
    }
  }, [map, stops])

  return null
}

function MapBounds({
  markers,
  userLocation,
  includeUser,
}: {
  markers: LatLng[]
  userLocation: LatLng | null
  includeUser: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (!map || markers.length === 0) return
    const bounds = new google.maps.LatLngBounds()
    for (const m of markers) {
      if (isValidCoord(m)) bounds.extend(m)
    }
    if (includeUser && userLocation && isValidCoord(userLocation)) bounds.extend(userLocation)
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 80, right: 80, bottom: 220, left: 80 })
    }
  }, [map, markers, userLocation, includeUser])

  return null
}

function MapZoomFocus({
  position,
  enabled,
}: {
  position: LatLng | null
  enabled: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (!map || !enabled || !position || !isValidCoord(position)) return
    map.panTo(position)
    const zoom = map.getZoom() ?? 12
    if (zoom < 16) map.setZoom(16)
  }, [map, position?.lat, position?.lng, enabled])

  return null
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
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
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

    rendererRef.current?.setMap(null)
    rendererRef.current = null
    onRouteInfo?.(null)
    onRouteError?.(null)

    if (!isValidCoord(resolvedOrigin) || !isValidCoord(destination)) {
      onRouteError?.('Invalid map coordinates for this route.')
      return
    }

    const renderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#3B82F6', strokeOpacity: 0.9, strokeWeight: 4 },
    })
    rendererRef.current = renderer

    const directionsService = new google.maps.DirectionsService()
    const travelMode =
      mode === 'DRIVE' ? google.maps.TravelMode.DRIVING : google.maps.TravelMode.WALKING
    const altMode =
      mode === 'DRIVE' ? google.maps.TravelMode.WALKING : google.maps.TravelMode.DRIVING

    function finishError(primary: string, fallback?: string) {
      onRouteError?.(
        `Could not draw route (${primary}${fallback ? ` / ${fallback}` : ''}). ` +
          'Check that Directions API is enabled for your Maps key.',
      )
    }

    function applyResult(result: google.maps.DirectionsResult) {
      renderer.setDirections(result)
      const leg = result.routes[0]?.legs[0]
      if (leg) {
        onRouteInfo?.({
          distance: leg.distance?.text ?? '',
          duration: leg.duration?.text ?? '',
          destinationName,
          originLabel,
        })
        const bounds = result.routes[0]?.bounds
        if (map && bounds) {
          map.fitBounds(bounds, { top: 80, right: 80, bottom: 220, left: 80 })
        }
      }
    }

    directionsService.route(
      { origin: resolvedOrigin, destination, travelMode },
      (result, status) => {
        if (status === 'OK' && result) {
          applyResult(result)
          return
        }
        directionsService.route(
          { origin: resolvedOrigin, destination, travelMode: altMode },
          (altResult, altStatus) => {
            if (altStatus === 'OK' && altResult) {
              applyResult(altResult)
            } else {
              finishError(status, altStatus)
            }
          },
        )
      },
    )

    return () => {
      rendererRef.current?.setMap(null)
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

export function MapView({
  places,
  itinerary,
  activeStopIndex,
  onMarkerClick,
  userLocation,
  theme,
  showUserLocation = true,
  routeFromUser = false,
  customRoute = null,
  routeMode = 'WALK',
  onRouteInfo,
  onRouteError,
  zoomFocusOnActive = false,
}: Props) {
  const markers = itinerary ?? places
  const markerCoords = markers
    .map((m) => m.coordinates)
    .filter(isValidCoord)
  const defaultCenter = defaultMapCenter(markerCoords, showUserLocation ? userLocation : null)
  const focusPos =
    zoomFocusOnActive && activeStopIndex !== null && markers[activeStopIndex]
      ? markers[activeStopIndex].coordinates
      : null

  const routeDestIndex = customRoute?.destinationIndex ?? activeStopIndex
  const routeDestination =
    routeDestIndex !== null && markers[routeDestIndex]
      ? markers[routeDestIndex]
      : null

  return (
    <APIProvider apiKey={API_KEY} libraries={['geometry', 'places']}>
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={markers.length > 0 ? 14 : 12}
        mapId="hodari-map"
        className="w-full h-full"
        gestureHandling="greedy"
        disableDefaultUI={false}
        colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'}
      >
        {!zoomFocusOnActive && (
          <MapBounds
            markers={markerCoords}
            userLocation={userLocation}
            includeUser={showUserLocation}
          />
        )}
        <MapZoomFocus position={focusPos} enabled={zoomFocusOnActive} />

        {showUserLocation && userLocation && isValidCoord(userLocation) && (
          <AdvancedMarker position={userLocation} title="Your location" zIndex={10}>
            <div className="user-location-dot" />
          </AdvancedMarker>
        )}

        {markers.map((item, i) => {
          const coords = 'coordinates' in item ? item.coordinates : (item as Place).coordinates
          const name = 'name' in item ? item.name : (item as Place).name
          const isActive = activeStopIndex === i

          return (
            <AdvancedMarker
              key={`${('place_id' in item && item.place_id) ? item.place_id : 'm'}-${i}`}
              position={coords}
              title={name}
              onClick={() => onMarkerClick(i)}
            >
              <Pin
                background={isActive ? '#F56A00' : '#ffffff'}
                borderColor={isActive ? '#C44A00' : '#F56A00'}
                glyphColor={isActive ? '#ffffff' : '#F56A00'}
                glyph={String(i + 1)}
                scale={isActive ? 1.2 : 1}
              />
            </AdvancedMarker>
          )
        })}

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
