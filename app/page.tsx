'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Settings, Download, Bug } from 'lucide-react'
import Transcript from '@/components/Transcript'
import Suggestions from '@/components/Suggestions'
import Chat from '@/components/Chat'
import SettingsModal from '@/components/SettingsModal'
import DebugPanel from '@/components/DebugPanel'

// Types
interface TranscriptChunk {
  text: string
  timestamp: string
}

interface Suggestion {
  type: string
  title: string
  preview: string
}

interface SuggestionBatch {
  id: string
  timestamp: string
  suggestions: Suggestion[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface DebugLog {
  id: string
  timestamp: string
  type: 'suggestion' | 'chat' | 'transcribe'
  prompt: string
  response: string
  latencyMs: number
  tokenEstimate: number
}

export default function Home() {
  // ── Audio recording state ──
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([])
  const transcriptRef = useRef<TranscriptChunk[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRecordingRef = useRef(false)

  // ── Suggestions state ──
  const [suggestionBatches, setSuggestionBatches] = useState<SuggestionBatch[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [countdown, setCountdown] = useState(30)

  // ── Chat state ──
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const chatMessagesRef = useRef<ChatMessage[]>([])
  const [isChatLoading, setIsChatLoading] = useState(false)

  // ── Debug state ──
  const [showDebug, setShowDebug] = useState(false)
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([])

  // ── Settings state ──
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({
    apiKey: '',
    suggestionPrompt: `You are an AI meeting copilot. Your job: analyze a live conversation and surface 3 maximally useful suggestions.

RECENT TRANSCRIPT:
{transcript}

STEP 1 — SILENTLY ANALYZE THE CONVERSATION STATE:
Before generating suggestions, internally determine:
- Phase: Is this early (introductions/agenda), mid (deep discussion), or late (wrapping up/action items)?
- Energy: Is the conversation flowing, stalled, heated, or winding down?
- Last utterance type: Was it a question asked? A claim made? A decision proposed? An opinion shared? A topic shift?
- Domain: What field is being discussed (technical, business, creative, academic, casual)?
- Gaps: What is NOT being said that should be? What assumptions are unchallenged?

STEP 2 — SELECT THE BEST MIX OF 3 SUGGESTIONS:
Based on your analysis, choose the most useful types RIGHT NOW:
- QUESTION: When discussion needs probing or a key question hasn't been asked
- TALKING_POINT: When you can add a relevant perspective or data point
- FACT_CHECK: When a specific claim was just made that could be verified
- CLARIFY: When something vague or ambiguous was said
- ANSWER: When someone just asked a question that can be answered

SELECTION RULES:
- If someone asked a question → at least one ANSWER
- If a factual claim was made → at least one FACT_CHECK
- If the conversation is stalling → prioritize TALKING_POINT
- If wrapping up → suggest action items or summary points
- Default to 3 DIFFERENT types for maximum value
- NEVER generate generic or obvious suggestions

STEP 3 — FORMAT EACH SUGGESTION:
- type: exactly one of QUESTION, TALKING_POINT, FACT_CHECK, CLARIFY, ANSWER
- title: 6-10 word punchy, specific headline
- preview: 1-2 sentences that deliver STANDALONE value even without clicking

Return ONLY valid JSON — no markdown, no backticks, no explanation:
[{"type":"...","title":"...","preview":"..."},{"type":"...","title":"...","preview":"..."},{"type":"...","title":"...","preview":"..."}]`,

    detailedAnswerPrompt: `You are a meeting copilot. The user clicked a suggestion and wants a useful, concise expansion.

TRANSCRIPT CONTEXT:
{transcript}

SUGGESTION CLICKED:
Type: {type} | Title: {title}
Preview: {preview}

RESPOND IN 100-150 WORDS. Be direct and actionable:
- Expand on the suggestion with specific, relevant details
- Reference what was actually said in the transcript
- Give 1-2 concrete next steps or action items
- If it's a FACT_CHECK, state what's accurate and what needs verification
- If it's an ANSWER, give the clearest possible answer
- If it's a QUESTION, explain why this question matters and what to listen for

FORMAT: Short paragraphs only. Bold key terms sparingly. No tables, no headers, no horizontal rules. Write like a smart colleague whispering advice — brief, specific, immediately useful.`,

    chatPrompt: `You are a meeting copilot. Answer the user's question using the conversation context.

MEETING TRANSCRIPT:
{transcript}

PREVIOUS CHAT:
{chatHistory}

USER'S QUESTION:
{userQuestion}

RULES:
- Use the transcript to give a specific, grounded answer
- If the answer isn't in the transcript, say so and answer from general knowledge
- Keep responses 80-150 words — concise and actionable
- No markdown tables, headers, or horizontal rules
- Bold only key terms. Short paragraphs only
- Write like a helpful colleague, not an essay`,

    contextWindowSuggestions: 800,
    contextWindowChat: 2000,
  })

  // Keep refs in sync
  useEffect(() => { transcriptRef.current = transcript }, [transcript])
  useEffect(() => { chatMessagesRef.current = chatMessages }, [chatMessages])

  // ── Helper: Add debug log ──
  const addDebugLog = (type: DebugLog['type'], prompt: string, response: string, latencyMs: number) => {
    const log: DebugLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      prompt,
      response,
      latencyMs,
      tokenEstimate: Math.round((prompt.length + response.length) / 4),
    }
    setDebugLogs(prev => [log, ...prev].slice(0, 50)) // keep last 50
  }

  // ── PROCESS AUDIO BLOB → WHISPER → TRANSCRIPT ──
  const processAudio = useCallback(async (audioBlob: Blob) => {
    if (!settings.apiKey) return

    const startTime = Date.now()

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('apiKey', settings.apiKey)

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        console.error('Transcription API error:', err)
        return
      }

      const data = await res.json()
      const latency = Date.now() - startTime

      if (data.text && data.text.trim()) {
        const newChunk: TranscriptChunk = {
          text: data.text.trim(),
          timestamp: new Date().toLocaleTimeString(),
        }

        addDebugLog('transcribe', '(audio blob)', data.text.trim(), latency)

        setTranscript(prev => {
          const updated = [...prev, newChunk]
          setTimeout(() => generateSuggestions(updated), 300)
          return updated
        })
      }
    } catch (error) {
      console.error('Transcription failed:', error)
    }
  }, [settings.apiKey])

  // ── START A NEW MEDIA RECORDER ──
  const startNewRecorder = useCallback(() => {
    if (!streamRef.current || !streamRef.current.active) return

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        chunksRef.current = []
        await processAudio(blob)
      }
      if (isRecordingRef.current && streamRef.current?.active) {
        startNewRecorder()
      }
    }

    recorder.start()
    mediaRecorderRef.current = recorder
  }, [processAudio])

  // ── GENERATE SUGGESTIONS ──
  const generateSuggestions = async (currentTranscript: TranscriptChunk[]) => {
    if (!settings.apiKey || currentTranscript.length === 0) return

    setIsLoadingSuggestions(true)
    const startTime = Date.now()

    try {
      const fullText = currentTranscript.map(t => t.text).join(' ')
      const words = fullText.split(' ')
      const recentText = words.length > settings.contextWindowSuggestions
        ? words.slice(-settings.contextWindowSuggestions).join(' ')
        : fullText

      const finalPrompt = settings.suggestionPrompt.replace('{transcript}', recentText)

      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: recentText,
          prompt: settings.suggestionPrompt,
          apiKey: settings.apiKey,
        }),
      })

      const data = await res.json()
      const latency = Date.now() - startTime

      if (data.suggestions && Array.isArray(data.suggestions)) {
        addDebugLog('suggestion', finalPrompt, JSON.stringify(data.suggestions, null, 2), latency)

        setSuggestionBatches(prev => [{
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          suggestions: data.suggestions,
        }, ...prev])
        setCountdown(30)
      } else {
        // Log the error so we can see it in debug panel
        const errorMsg = data.error || 'Unknown error'
        const rawResponse = data.raw || ''
        console.error('Suggestion API error:', errorMsg, rawResponse)
        addDebugLog('suggestion', finalPrompt, `ERROR: ${errorMsg}\n\nRAW: ${rawResponse}`, latency)
      }
    } catch (error: any) {
      console.error('Suggestion generation failed:', error)
      addDebugLog('suggestion', '(failed to send)', `FETCH ERROR: ${error.message}`, Date.now() - startTime)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  // ── TOGGLE RECORDING ──
  const toggleRecording = async () => {
    if (isRecording) {
      isRecordingRef.current = false
      setIsRecording(false)

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    } else {
      if (!settings.apiKey) {
        alert('Please add your Groq API key in Settings first!')
        setShowSettings(true)
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        isRecordingRef.current = true
        setIsRecording(true)
        setCountdown(30)

        startNewRecorder()

        intervalRef.current = setInterval(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
        }, 30000)
      } catch (err) {
        console.error('Mic access denied:', err)
        alert('Microphone access is required. Please allow it and try again.')
      }
    }
  }

  // ── MANUAL REFRESH ──
  const handleManualRefresh = () => {
    if (transcriptRef.current.length > 0) {
      generateSuggestions(transcriptRef.current)
    }
  }

  // ── COUNTDOWN TIMER ──
  useEffect(() => {
    if (!isRecording) return
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 30 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [isRecording])

  // ── SUGGESTION CLICK → DETAILED ANSWER ──
  const handleSuggestionClick = async (suggestion: Suggestion) => {
    if (!settings.apiKey || isChatLoading) return

    setChatMessages(prev => [...prev, {
      role: 'user',
      content: suggestion.title,
      timestamp: new Date().toLocaleTimeString(),
    }])
    setIsChatLoading(true)

    const startTime = Date.now()

    try {
      const fullTranscript = transcriptRef.current
        .map(t => `[${t.timestamp}] ${t.text}`)
        .join('\n\n') || '(No transcript yet)'

      const finalPrompt = settings.detailedAnswerPrompt
        .replace('{transcript}', fullTranscript)
        .replace('{type}', suggestion.type)
        .replace('{title}', suggestion.title)
        .replace('{preview}', suggestion.preview)

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: finalPrompt }],
          apiKey: settings.apiKey,
        }),
      })

      const data = await res.json()
      const latency = Date.now() - startTime
      const responseText = data.response || 'Sorry, could not generate a response.'

      addDebugLog('chat', finalPrompt, responseText, latency)

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString(),
      }])
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date().toLocaleTimeString(),
      }])
    } finally {
      setIsChatLoading(false)
    }
  }

  // ── CHAT SEND (BUG FIXED: uses ref for fresh chat history) ──
  const handleChatSend = async (message: string) => {
    if (!settings.apiKey || !message.trim() || isChatLoading) return

    const userMsg: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString(),
    }
    setChatMessages(prev => [...prev, userMsg])
    setIsChatLoading(true)

    const startTime = Date.now()

    try {
      const fullTranscript = transcriptRef.current
        .map(t => `[${t.timestamp}] ${t.text}`)
        .join('\n\n') || '(No transcript yet)'

      // BUG FIX: use ref to get latest chat history including the message just added
      const currentHistory = [...chatMessagesRef.current, userMsg]
      const chatHistory = currentHistory
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n') || '(No prior chat)'

      const finalPrompt = settings.chatPrompt
        .replace('{transcript}', fullTranscript)
        .replace('{chatHistory}', chatHistory)
        .replace('{userQuestion}', message)

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: finalPrompt }],
          apiKey: settings.apiKey,
        }),
      })

      const data = await res.json()
      const latency = Date.now() - startTime
      const responseText = data.response || 'Sorry, could not generate a response.'

      addDebugLog('chat', finalPrompt, responseText, latency)

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString(),
      }])
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date().toLocaleTimeString(),
      }])
    } finally {
      setIsChatLoading(false)
    }
  }

  // ── EXPORT SESSION ──
  const handleExport = () => {
    const data = {
      exported_at: new Date().toISOString(),
      transcript: transcript,
      suggestion_batches: suggestionBatches,
      chat_history: chatMessages,
      debug_logs: debugLogs,
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `twinmind-session-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── CLEANUP ──
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '14px',
            fontWeight: '600',
            letterSpacing: '0.02em',
          }}>
            TwinMind — Live Suggestions Web App
          </h1>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Live Meeting Copilot
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn"
            onClick={() => setShowDebug(!showDebug)}
            style={showDebug ? { borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' } : {}}
          >
            <Bug size={14} />
            Debug
          </button>
          <button className="btn" onClick={handleExport}>
            <Download size={14} />
            Export
          </button>
          <button className="btn" onClick={() => setShowSettings(true)}>
            <Settings size={14} />
            Settings
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: showDebug ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr',
        gap: '16px',
        padding: '16px',
        overflow: 'hidden',
        transition: 'grid-template-columns 0.3s ease',
      }}>
        <Transcript
          isRecording={isRecording}
          transcript={transcript}
          onToggleRecording={toggleRecording}
        />

        <Suggestions
          batches={suggestionBatches}
          isLoading={isLoadingSuggestions}
          countdown={countdown}
          onRefresh={handleManualRefresh}
          onSuggestionClick={handleSuggestionClick}
        />

        <Chat
          messages={chatMessages}
          onSend={handleChatSend}
          isLoading={isChatLoading}
        />

        {showDebug && (
          <DebugPanel logs={debugLogs} />
        )}
      </main>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={(s) => { setSettings(s); setShowSettings(false) }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
