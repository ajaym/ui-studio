import { useState, useEffect, useRef } from 'react'
import type { ApiKeyStatus } from '@shared/types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [status, setStatus] = useState<ApiKeyStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadStatus()
      setApiKeyInput('')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, status])

  async function loadStatus() {
    const s = await window.electronAPI.apiKey.getStatus()
    setStatus(s)
  }

  async function handleSave() {
    if (!apiKeyInput.trim()) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    const result = await window.electronAPI.apiKey.set({ apiKey: apiKeyInput.trim() })

    if (result.success) {
      setSuccess(true)
      setApiKeyInput('')
      await loadStatus()
    } else {
      setError(result.error || 'Failed to save API key')
    }

    setSaving(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !saving && apiKeyInput.trim()) {
      handleSave()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anthropic API Key
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Required to use the AI agent. Get your key from{' '}
              <span className="text-primary-600 font-medium">console.anthropic.com</span>
            </p>

            {/* Current status */}
            {status && (
              <div className={`flex items-center gap-2 text-sm mb-3 px-3 py-2 rounded-lg ${status.isSet ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                <div className={`w-2 h-2 rounded-full ${status.isSet ? 'bg-green-500' : 'bg-amber-500'}`} />
                {status.isSet ? (
                  <span>Active: <code className="text-xs bg-green-100 px-1.5 py-0.5 rounded">{status.maskedKey}</code></span>
                ) : (
                  <span>No API key configured</span>
                )}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={status?.isSet ? 'Enter new key to replace' : 'sk-ant-...'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={saving}
              />
              <button
                onClick={handleSave}
                disabled={saving || !apiKeyInput.trim()}
                className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}

            {/* Success */}
            {success && (
              <p className="mt-2 text-sm text-green-600">API key saved and verified.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <p className="text-xs text-gray-400">
            Your key is stored locally on this device and is never shared.
          </p>
        </div>
      </div>
    </div>
  )
}
