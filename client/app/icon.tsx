import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0C0B0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
        }}
      >
        <span style={{ color: '#E8A020', fontSize: 22, fontWeight: 900, fontStyle: 'italic', lineHeight: 1 }}>
          H
        </span>
      </div>
    ),
    { ...size },
  )
}
