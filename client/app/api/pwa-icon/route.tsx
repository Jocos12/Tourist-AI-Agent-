import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const sz = Math.min(512, Math.max(32, parseInt(req.nextUrl.searchParams.get('size') ?? '192')))
  const fontSize = Math.round(sz * 0.68)
  const radius = Math.round(sz * 0.22)

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0C0B0A 0%, #1E1C14 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius,
        }}
      >
        <span style={{ color: '#E8A020', fontSize, fontWeight: 900, fontStyle: 'italic', lineHeight: 1 }}>
          H
        </span>
      </div>
    ),
    { width: sz, height: sz },
  )
}
