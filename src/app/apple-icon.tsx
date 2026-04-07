import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          borderRadius: 36,
        }}
      >
        <span style={{ color: 'white', fontSize: 64, fontWeight: 800, letterSpacing: -3 }}>TW</span>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#38bdf8' }} />
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#818cf8' }} />
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#a78bfa' }} />
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#f472b6' }} />
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#fb923c' }} />
        </div>
        <span style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600, letterSpacing: 4, marginTop: 8 }}>AI AGENTS</span>
      </div>
    ),
    { ...size }
  )
}
