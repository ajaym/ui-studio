import { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import type { Message, Attachment } from '@shared/types'

interface ChatPanelProps {
  onPreviewReady: (url: string) => void
}

export default function ChatPanel({ onPreviewReady }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

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
