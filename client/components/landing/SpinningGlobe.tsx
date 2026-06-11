'use client'

import { useEffect, useRef } from 'react'

const BASE_SPEED = 0.6 // texture drift in %/s when the mouse is centered
const MAX_BOOST = 4.5  // extra %/s at the screen edges

/**
 * Mouse-reactive rotating planet: a circular viewport over a seamlessly
 * panning equirectangular night texture, with limb shading, a sun highlight
 * and an orange atmosphere glow. Cursor position steers the spin — left half
 * of the screen spins it left, right half spins it right, eased smoothly.
 * Size it from the parent — the component fills its width as a square.
 */
export default function SpinningGlobe({ className = '' }: { className?: string }) {
  const trackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // The track is 400% of the sphere; one texture copy is 50% of the track,
    // so offset lives in [0, 50) and wraps seamlessly in both directions.
    let offset = 0
    let velocity = BASE_SPEED
    let target = BASE_SPEED
    let last = performance.now()
    let raf = 0

    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5 // -0.5 .. 0.5
      target = BASE_SPEED + x * 2 * MAX_BOOST
    }

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      velocity += (target - velocity) * Math.min(1, dt * 2.5)
      offset = (offset + velocity * dt) % 50
      if (offset < 0) offset += 50
      track.style.transform = `translateX(${-offset}%)`
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    // Positioning (absolute/relative + placement) comes from the caller; the
    // root just needs to BE a positioning context, which the caller's class provides.
    <div className={`pointer-events-none aspect-square select-none ${className}`} aria-hidden>
      {/* Atmosphere glow */}
      <div className="absolute -inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(245,106,0,0.16)_50%,rgba(245,106,0,0.06)_64%,transparent_74%)] blur-2xl" />

      {/* Sphere */}
      <div className="absolute inset-0 overflow-hidden rounded-full bg-[#060a14]">
        <div ref={trackRef} className="absolute inset-y-0 left-0 flex w-[400%] will-change-transform">
          <img
            src="/landing/earth-night.jpg"
            alt=""
            draggable={false}
            className="h-full w-1/2 object-cover brightness-[1.65] saturate-[1.5] sepia-[0.22]"
          />
          <img
            src="/landing/earth-night.jpg"
            alt=""
            draggable={false}
            className="h-full w-1/2 object-cover brightness-[1.65] saturate-[1.5] sepia-[0.22]"
          />
        </div>
        {/* Warm the city lights toward Hodari gold */}
        <div className="absolute inset-0 bg-[#F56A00]/15 mix-blend-overlay" />
        {/* Sun highlight + limb darkening */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 32% 26%, rgba(255,255,255,0.16) 0%, transparent 44%), radial-gradient(circle at 50% 50%, transparent 50%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.78) 100%)',
          }}
        />
      </div>

      {/* Rim light */}
      <div className="absolute inset-0 rounded-full shadow-[inset_2px_3px_22px_rgba(255,255,255,0.22),inset_-28px_-18px_70px_rgba(0,0,0,0.5)]" />
    </div>
  )
}
