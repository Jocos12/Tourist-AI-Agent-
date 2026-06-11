'use client'

import { useEffect } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { Avatar } from '@/components/ui'
import { defaultMapCenter, isValidCoord, type LatLng } from '@/lib/geo'
import type { MapPresenceUser } from '@/lib/community/types'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

function FitBounds({ markers, userLocation }: { markers: LatLng[]; userLocation: LatLng | null }) {
  const map = useMap()

  useEffect(() => {
    if (!map || markers.length === 0) return
    const bounds = new google.maps.LatLngBounds()
    for (const m of markers) {
      if (isValidCoord(m)) bounds.extend(m)
    }
    if (userLocation && isValidCoord(userLocation)) bounds.extend(userLocation)
    if (!bounds.isEmpty()) map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 })
  }, [map, markers, userLocation])

  return null
}

interface Props {
  users: MapPresenceUser[]
  userLocation: LatLng | null
  selectedUserId: string | null
  onSelectUser: (userId: string) => void
  theme: 'light' | 'dark'
}

export function PresenceMap({ users, userLocation, selectedUserId, onSelectUser, theme }: Props) {
  const markerCoords = users.map((u) => u.location).filter(isValidCoord)
  const center = defaultMapCenter(markerCoords, userLocation)

  if (!API_KEY) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface2 rounded-2xl border border-border p-6 text-center">
        <p className="text-sm text-text2">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the presence map.</p>
      </div>
    )
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        defaultCenter={center}
        defaultZoom={12}
        mapId="hodari-community-map"
        className="w-full h-full rounded-2xl"
        gestureHandling="greedy"
        disableDefaultUI={false}
        colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'}
      >
        <FitBounds markers={markerCoords} userLocation={userLocation} />

        {userLocation && isValidCoord(userLocation) && (
          <AdvancedMarker position={userLocation} title="You">
            <div className="user-location-dot" />
          </AdvancedMarker>
        )}

        {users.map((user) => {
          const selected = selectedUserId === user.user_id
          return (
            <AdvancedMarker
              key={user.user_id}
              position={user.location}
              title={user.display_name}
              onClick={() => onSelectUser(user.user_id)}
            >
              <button
                type="button"
                className={`flex flex-col items-center gap-1 transition-transform ${selected ? 'scale-110' : 'hover:scale-105'}`}
                onClick={() => onSelectUser(user.user_id)}
              >
                <span className={`rounded-full ring-2 ${selected ? 'ring-gold' : 'ring-white/80'} shadow-lg`}>
                  <Avatar name={user.display_name} size="md" status="online" />
                </span>
                <span className="text-[10px] font-mono bg-bg/90 text-text px-1.5 py-0.5 rounded-md border border-border max-w-[88px] truncate">
                  {user.display_name.split(' ')[0]}
                </span>
              </button>
            </AdvancedMarker>
          )
        })}
      </Map>
    </APIProvider>
  )
}
