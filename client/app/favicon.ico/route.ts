import { NextResponse } from 'next/server'

export async function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" fill="#0C0B0A"/>
    <text x="32" y="44" text-anchor="middle" fill="#E8A020" font-size="42" font-weight="900" font-style="italic" font-family="Georgia, serif">H</text>
  </svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
