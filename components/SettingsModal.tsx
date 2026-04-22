import { useState } from 'react'
import { X } from 'lucide-react'

interface SettingsProps {
  settings: {
    apiKey: string
    suggestionPrompt: string
    chatPrompt: string
    detailedAnswerPrompt: string
    contextWindowSuggestions: number
    contextWindowChat: number
  }
  onSave: (settings: any) => void
  onClose: () => void
}

export default function SettingsModal({ settings, onSave, onClose }: SettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings)

  const handleSave = () => {
    onSave(localSettings)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="modal-title">Settings</h2>
          <button className="btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div className="field-label">Groq API Key</div>
          <input
            type="password"
            className="field-input"
            placeholder="Enter your Groq API key"
            value={localSettings.apiKey}
            onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
          />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '-12px', marginBottom: '16px' }}>
            Get your free API key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>console.groq.com</a>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div className="field-label">Context Window - Suggestions (words)</div>
          <input
            type="number"
            className="field-input"
            value={localSettings.contextWindowSuggestions}
            onChange={(e) => setLocalSettings({ ...localSettings, contextWindowSuggestions: parseInt(e.target.value) || 800 })}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div className="field-label">Context Window - Chat (words)</div>
          <input
            type="number"
            className="field-input"
            value={localSettings.contextWindowChat}
            onChange={(e) => setLocalSettings({ ...localSettings, contextWindowChat: parseInt(e.target.value) || 2000 })}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div className="field-label">Live Suggestion Prompt</div>
          <textarea
            className="field-textarea"
            rows={8}
            value={localSettings.suggestionPrompt}
            onChange={(e) => setLocalSettings({ ...localSettings, suggestionPrompt: e.target.value })}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div className="field-label">Detailed Answer Prompt (on click)</div>
          <textarea
            className="field-textarea"
            rows={6}
            value={localSettings.detailedAnswerPrompt}
            onChange={(e) => setLocalSettings({ ...localSettings, detailedAnswerPrompt: e.target.value })}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div className="field-label">Chat Prompt</div>
          <textarea
            className="field-textarea"
            rows={6}
            value={localSettings.chatPrompt}
            onChange={(e) => setLocalSettings({ ...localSettings, chatPrompt: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  )
}
