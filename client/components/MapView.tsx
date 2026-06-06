'use client'

import { useEffect, useRef } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps'
import type { ItineraryStop, Place, Theme } from '@/lib/types'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

interface Props {
  places: Place[]
  itinerary: ItineraryStop[] | null
  activeStopIndex: number | null
  onMarkerClick: (index: number) => void
  userLocation: { lat: number; lng: number } | null
  theme: Theme
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
        // Backend-provided encoded polyline — decode and draw directly
        const path = google.maps.geometry.encoding.decodePath(enc)
        polylinesRef.current.push(new google.maps.Polyline({ ...style, path }))
      } else {
        // No polyline from backend — ask Directions API for the road-following route
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

export function MapView({ places, itinerary, activeStopIndex, onMarkerClick, userLocation, theme }: Props) {
  const markers = itinerary ?? places

  // Prefer user location as default center when no places loaded
  const defaultCenter = markers[0]?.coordinates
    ?? userLocation
    ?? { lat: 41.385, lng: 2.173 } // fallback: Barcelona

  return (
    <APIProvider apiKey={API_KEY} libraries={['geometry', 'places']}>
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={markers.length > 0 ? 14 : 13}
        mapId="hodari-map"
        className="w-full h-full"
        gestureHandling="greedy"
        disableDefaultUI={false}
        colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'}
      >
        {/* User location — pulsing blue dot */}
        {userLocation && (
          <AdvancedMarker position={userLocation} title="Your location" zIndex={10}>
            <div className="user-location-dot" />
          </AdvancedMarker>
        )}

        {/* Place / itinerary markers */}
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

        {itinerary && itinerary.length >= 2 && (
          <RoutePolyline stops={itinerary} />
        )}
      </Map>
    </APIProvider>
  )
}
