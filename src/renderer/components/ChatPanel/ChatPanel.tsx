import { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import type { Message, Attachment } from '@shared/types'

interface ChatPanelProps {
  onPreviewReady: (url: string) => void
  projectId: string | null
}

export default function ChatPanel({ onPreviewReady, projectId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasRestoredSession, setHasRestoredSession] = useState(false)

  // Load saved messages when opening a project with existing memory
  useEffect(() => {
    if (!projectId) {
      setHasRestoredSession(false)
      return
    }

    window.electronAPI.memory.loadMessages(projectId).then((result) => {
      if (result.hasPreviousSession && result.messages.length > 0) {
        setMessages(result.messages)
        setHasRestoredSession(true)
      }
    }).catch((err) => {
      console.error('Failed to load saved messages:', err)
    })
  }, [projectId])

  useEffect(() => {
    // Listen for incoming messages from main process
    const unsubscribeReceive = window.electronAPI.chat.onReceive((payload) => {
      setMessages((prev) => [...prev, payload.message])
      setIsLoading(false)
    })

    // Listen for streaming updates
    const unsubscribeStream = window.electronAPI.chat.onStream((payload) => {
      setMessages((prev) => {
        const existing = prev.find((m) => m.id === payload.messageId)
        if (existing) {
          return prev.map((m) =>
            m.id === payload.messageId
              ? {
                  ...m,
                  content: m.content + payload.delta,
                  isStreaming: !payload.isComplete,
                }
              : m
          )
        } else {
          // Create new streaming message
          return [
            ...prev,
            {
              id: payload.messageId,
              role: 'assistant' as const,
              content: payload.delta,
              timestamp: Date.now(),
              isStreaming: !payload.isComplete,
            },
          ]
        }
      })

      if (payload.isComplete) {
        setIsLoading(false)
      }
    })

    // Listen for errors
    const unsubscribeError = window.electronAPI.chat.onError((error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: 'assistant',
          content: `Error: ${error}`,
          timestamp: Date.now(),
        },
      ])
      setIsLoading(false)
    })

    return () => {
      unsubscribeReceive()
      unsubscribeStream()
      unsubscribeError()
    }
  }, [])

  const handleSendMessage = async (content: string, attachments?: Attachment[]) => {
    // Add user message to UI
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content,
      timestamp: Date.now(),
      attachments,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Send to main process
    try {
      await window.electronAPI.chat.send({ message: content, attachments })
    } catch (error) {
      console.error('Failed to send message:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Restored session indicator */}
      {hasRestoredSession && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-sm text-blue-700 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1v6l3 3" />
            <circle cx="8" cy="8" r="7" />
          </svg>
          Previous session restored
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* Input area */}
      <div className="border-t">
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  )
}
