import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatProps {
  messages: ChatMessage[]
  onSend: (message: string) => void
  isLoading?: boolean
}

// Converts markdown tables to HTML tables
function renderTable(tableText: string): string {
  const lines = tableText.trim().split('\n').filter(line => line.trim())
  if (lines.length < 2) return tableText

  // Check if it's actually a table (has pipes)
  if (!lines[0].includes('|')) return tableText

  const parseRow = (line: string) =>
    line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0)

  const headers = parseRow(lines[0])

  // Find where separator row is (contains ---)
  let dataStartIdx = 1
  if (lines[1] && lines[1].includes('---')) {
    dataStartIdx = 2
  }

  const rows = lines.slice(dataStartIdx).map(parseRow)

  let html = '<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;">'

  // Header
  html += '<tr>'
  headers.forEach(h => {
    html += `<th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--border);color:var(--accent-blue);font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:0.05em;">${h}</th>`
  })
  html += '</tr>'

  // Rows
  rows.forEach(row => {
    html += '<tr>'
    row.forEach(cell => {
      html += `<td style="padding:5px 8px;border-bottom:1px solid var(--border);color:var(--text-secondary);font-size:12px;line-height:1.5;">${cell}</td>`
    })
    html += '</tr>'
  })

  html += '</table>'
  return html
}

// Full markdown to HTML converter
function renderMarkdown(text: string): string {
  // First, extract and convert tables
  const tableRegex = /(\|.+\|[\r\n]+\|[-| :]+\|[\r\n]+((\|.+\|[\r\n]*)+))/g
  let processed = text.replace(tableRegex, (match) => renderTable(match))

  return processed
    // Bold: **text** or __text__
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_ (but not inside words)
    .replace(/(?<!\w)\*(.*?)\*(?!\w)/g, '<em>$1</em>')
    // Inline code: `code`
    .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:3px;font-family:JetBrains Mono,monospace;font-size:11px;">$1</code>')
    // Horizontal rule: --- or ***
    .replace(/^(---|\*\*\*)$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:12px 0;"/>')
    // Numbered lists: 1. item
    .replace(/^\d+\.\s+(.*)/gm, '<div style="padding-left:16px;margin:3px 0;">• $1</div>')
    // Bullet lists: - item or * item
    .replace(/^[-•*]\s+(.*)/gm, '<div style="padding-left:16px;margin:3px 0;">• $1</div>')
    // Headers
    .replace(/^###\s+(.*)/gm, '<div style="font-weight:600;font-size:13px;margin:10px 0 4px;color:var(--text-primary);">$1</div>')
    .replace(/^##\s+(.*)/gm, '<div style="font-weight:600;font-size:14px;margin:10px 0 4px;color:var(--text-primary);">$1</div>')
    .replace(/^#\s+(.*)/gm, '<div style="font-weight:600;font-size:14px;margin:10px 0 4px;color:var(--text-primary);">$1</div>')
    // Double newline → paragraph break
    .replace(/\n\n/g, '<div style="margin:10px 0;"></div>')
    // Single newline → line break
    .replace(/\n/g, '<br/>')
}

export default function Chat({ messages, onSend, isLoading = false }: ChatProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span>3. CHAT (DETAILED ANSWERS)</span>
        <span className="status-badge">SESSION-ONLY</span>
      </div>

      <div ref={scrollRef} className="panel-body">
        {messages.length === 0 && !isLoading ? (
          <div className="empty-state">
            Click a suggestion or type a question below.
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <div className="chat-role">
                  {msg.role === 'user' ? 'YOU' : 'ASSISTANT'} · {msg.timestamp}
                </div>
                {msg.role === 'user' ? (
                  <div className="bubble">{msg.content}</div>
                ) : (
                  <div
                    className="bubble"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                )}
              </div>
            ))}

            {isLoading && (
              <div className="chat-message assistant">
                <div className="chat-role">ASSISTANT · typing...</div>
                <div className="bubble">
                  <div className="loading-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="chat-input-area">
        <input
          className="chat-input"
          placeholder="Ask anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <Send size={14} />
          Send
        </button>
      </div>
    </div>
  )
}
