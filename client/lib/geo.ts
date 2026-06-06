export type LatLng = { lat: number; lng: number }

/** Fallback map center when the user has not granted location (SF Bay Area). */
export const SF_BAY_CENTER: LatLng = { lat: 37.6819, lng: -122.3453 }

/** Rough distance in km between two WGS84 points. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) / 180) * Math.PI
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function isValidCoord(c: LatLng): boolean {
  return (
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    Math.abs(c.lat) <= 90 &&
    Math.abs(c.lng) <= 180 &&
    !(c.lat === 0 && c.lng === 0)
  )
}

/** True when pins are implausibly far from the user's GPS (wrong city search). */
export function pinsFarFromUser(user: LatLng, places: LatLng[], thresholdKm = 80): boolean {
  if (!isValidCoord(user) || places.length === 0) return false
  const nearest = Math.min(...places.map((p) => distanceKm(user, p)))
  return nearest > thresholdKm
}

export function requestUserLocation(): Promise<LatLng | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 120_000 },
    )
  })
}

/**
 * Initial map center: user's GPS when available, otherwise SF Bay Area.
 * When places load, MapBounds fitBounds overrides this to show pins + user.
 */
export function defaultMapCenter(
  _markers: LatLng[],
  userLocation: LatLng | null,
): LatLng {
  if (userLocation && isValidCoord(userLocation)) return userLocation
  return SF_BAY_CENTER
}
