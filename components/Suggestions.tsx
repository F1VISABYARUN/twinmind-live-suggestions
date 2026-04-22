import { RefreshCw } from 'lucide-react'

interface SuggestionBatch {
  id: string
  timestamp: string
  suggestions: Array<{
    type: string
    title: string
    preview: string
  }>
}

interface SuggestionsProps {
  batches: SuggestionBatch[]
  isLoading: boolean
  countdown: number
  onRefresh: () => void
  onSuggestionClick: (suggestion: any) => void
}

export default function Suggestions({
  batches,
  isLoading,
  countdown,
  onRefresh,
  onSuggestionClick,
}: SuggestionsProps) {

  const getTagClass = (type: string) => {
    const t = type.toUpperCase()
    if (t.includes('QUESTION')) return 'tag-question'
    if (t.includes('TALKING')) return 'tag-talking'
    if (t.includes('ANSWER')) return 'tag-answer'
    if (t.includes('FACT') || t.includes('CHECK')) return 'tag-factcheck'
    if (t.includes('CLARIFY')) return 'tag-clarify'
    return 'tag-question'
  }

  const formatType = (type: string) => type.replace(/_/g, ' ')

  return (
    <div className="panel">
      <div className="panel-header">
        <span>2. LIVE SUGGESTIONS</span>
        <span className="status-badge">
          {batches.length} {batches.length === 1 ? 'BATCH' : 'BATCHES'}
        </span>
      </div>

      {/* Reload bar */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <button className="btn" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw size={14} style={isLoading ? { animation: 'spin 1s linear infinite' } : {}} />
          Reload suggestions
        </button>
        <span className="countdown">auto-refresh in {countdown}s</span>
      </div>

      {/* Suggestion list */}
      <div className="panel-body">
        {isLoading && batches.length === 0 && (
          <div className="empty-state">
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
            <div style={{ marginTop: '8px' }}>Generating suggestions...</div>
          </div>
        )}

        {!isLoading && batches.length === 0 && (
          <div className="empty-state">
            Suggestions appear here once recording starts.
          </div>
        )}

        {batches.map((batch, batchIdx) => (
          <div key={batch.id} className="suggestion-batch">
            {/* Suggestion cards */}
            {batch.suggestions.map((s, idx) => (
              <div
                key={idx}
                className={`suggestion-card ${batchIdx > 0 ? 'old' : ''}`}
                onClick={() => onSuggestionClick(s)}
              >
                <div className={`suggestion-tag ${getTagClass(s.type)}`}>
                  {formatType(s.type)}
                </div>
                <div className="suggestion-title">{s.title}</div>
                <div className="suggestion-preview">{s.preview}</div>
              </div>
            ))}

            {/* Batch label at bottom */}
            <div style={{
              textAlign: 'center',
              padding: '8px 0 16px',
            }}>
              <span className="batch-label">
                — BATCH {batches.length - batchIdx} · {batch.timestamp} —
              </span>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
