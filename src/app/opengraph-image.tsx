import { ImageResponse } from 'next/og'

export const alt = 'Teeworld AI Agents - Hệ thống quản lý doanh nghiệp thông minh'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  const agents = [
    { name: 'CEO', color: '#f59e0b' },
    { name: 'HR', color: '#8b5cf6' },
    { name: 'CFO', color: '#10b981' },
    { name: 'MKT', color: '#3b82f6' },
    { name: 'Coach', color: '#f43f5e' },
    { name: 'Channel', color: '#06b6d4' },
    { name: 'Kho', color: '#eab308' },
    { name: 'BST', color: '#d946ef' },
    { name: 'MR', color: '#0ea5e9' },
    { name: 'STR', color: '#ef4444' },
    { name: 'TL', color: '#64748b' },
  ]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          padding: 60,
        }}
      >
        {/* Top section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Logo */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #334155, #1e293b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #475569',
            }}
          >
            <span style={{ color: 'white', fontSize: 36, fontWeight: 800, letterSpacing: -2 }}>TW</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: 'white', fontSize: 48, fontWeight: 800, letterSpacing: -1 }}>Teeworld AI Agents</span>
            <span style={{ color: '#94a3b8', fontSize: 22 }}>11 AI Agents vận hành doanh nghiệp graphic tees</span>
          </div>
        </div>

        {/* Agent circles */}
        <div style={{ display: 'flex', gap: 16, marginTop: 48, flexWrap: 'wrap' }}>
          {agents.map((agent) => (
            <div
              key={agent.name}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                background: agent.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 20px ${agent.color}40`,
              }}
            >
              <span style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>{agent.name}</span>
            </div>
          ))}
        </div>

        {/* Bottom stats */}
        <div style={{ display: 'flex', gap: 48, marginTop: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#38bdf8', fontSize: 36, fontWeight: 800 }}>20 ty</span>
            <span style={{ color: '#64748b', fontSize: 16 }}>Revenue Target</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#a78bfa', fontSize: 36, fontWeight: 800 }}>11 Agents</span>
            <span style={{ color: '#64748b', fontSize: 16 }}>AI Management Team</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#34d399', fontSize: 36, fontWeight: 800 }}>5 Phases</span>
            <span style={{ color: '#64748b', fontSize: 16 }}>Intel - Strategy - Plan - QC - Report</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
