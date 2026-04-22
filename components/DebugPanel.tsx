import { useState } from 'react'

interface DebugLog {
  id: string
  timestamp: string
  type: 'suggestion' | 'chat' | 'transcribe'
  prompt: string
  response: string
  latencyMs: number
  tokenEstimate: number
}

interface DebugPanelProps {
  logs: DebugLog[]
}

export default function DebugPanel({ logs }: DebugPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const getTypeColor = (type: string) => {
    if (type === 'suggestion') return 'var(--accent-green)'
    if (type === 'chat') return 'var(--accent-blue)'
    return 'var(--accent-yellow)'
  }

  const getTypeLabel = (type: string) => {
    if (type === 'suggestion') return 'SUGGEST'
    if (type === 'chat') return 'CHAT'
    return 'WHISPER'
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span>4. PROMPT DEBUG</span>
        <span className="status-badge">{logs.length} CALLS</span>
      </div>

      <div className="panel-body">
        {logs.length === 0 ? (
          <div className="empty-state">
            API calls will appear here with full prompt details, latency, and token estimates.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              style={{
                marginBottom: '10px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
            >
              {/* Header row */}
              <div style={{
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9px',
                    letterSpacing: '0.1em',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: `${getTypeColor(log.type)}20`,
                    color: getTypeColor(log.type),
                    fontWeight: 500,
                  }}>
                    {getTypeLabel(log.type)}
                  </span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                  }}>
                    {log.timestamp}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px',
                    color: log.latencyMs > 3000 ? 'var(--accent-red)' : 'var(--accent-green)',
                  }}>
                    {log.latencyMs}ms
                  </span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                  }}>
                    ~{log.tokenEstimate} tok
                  </span>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === log.id && (
                <div style={{
                  borderTop: '1px solid var(--border)',
                  padding: '10px 12px',
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9px',
                      color: 'var(--accent-blue)',
                      letterSpacing: '0.1em',
                      marginBottom: '4px',
                    }}>
                      PROMPT SENT
                    </div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-base)',
                      padding: '8px',
                      borderRadius: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: '1.5',
                    }}>
                      {log.prompt}
                    </div>
                  </div>

                  <div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9px',
                      color: 'var(--accent-green)',
                      letterSpacing: '0.1em',
                      marginBottom: '4px',
                    }}>
                      RESPONSE
                    </div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-base)',
                      padding: '8px',
                      borderRadius: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: '1.5',
                    }}>
                      {log.response}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
