import { useEffect, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'

interface TranscriptProps {
  isRecording: boolean
  transcript: Array<{ text: string; timestamp: string }>
  onToggleRecording: () => void
}

export default function Transcript({ isRecording, transcript, onToggleRecording }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  return (
    <div className="panel">
      <div className="panel-header">
        <span>1. MIC & TRANSCRIPT</span>
        <span className={`status-badge ${isRecording ? 'recording' : ''}`}>
          {isRecording ? 'RECORDING' : 'IDLE'}
        </span>
      </div>

      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Mic Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className={`mic-btn ${isRecording ? 'recording' : 'idle'}`}
            onClick={onToggleRecording}
          >
            {isRecording ? (
              <MicOff size={22} color="#f26b6b" />
            ) : (
              <Mic size={22} color="#4d9ef7" />
            )}
          </button>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
              {isRecording ? 'Recording... Click to stop.' : 'Click mic to start. Transcript appends every ~30s.'}
            </div>
            {isRecording && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Transcript appends every ~30s
              </div>
            )}
          </div>
        </div>

        {/* Transcript Area */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}
        >
          {transcript.length === 0 ? (
            <div className="empty-state">
              {isRecording
                ? 'Listening... transcript will appear after ~30 seconds.'
                : 'No transcript yet — start the mic.'}
            </div>
          ) : (
            transcript.map((chunk, idx) => (
              <div key={idx} className="transcript-chunk">
                <div className="chunk-time">{chunk.timestamp}</div>
                <div>{chunk.text}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
