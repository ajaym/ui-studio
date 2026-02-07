import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Message } from '@shared/types'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-4 py-4">
      {messages.length === 0 && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 text-2xl font-bold">UI</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Welcome to UI Studio
            </h2>
            <p className="text-gray-600 text-sm">
              Describe the interface you want to build, and I'll create an interactive
              prototype using your design system.
            </p>
            <div className="mt-6 text-left space-y-2">
              <p className="text-xs text-gray-500 font-medium">Try:</p>
              <div className="space-y-1">
                <div className="text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
                  "Create a dashboard with user stats and recent activity"
                </div>
                <div className="text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
                  "Build a settings page with form inputs"
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`mb-4 ${message.role === 'user' ? 'ml-8' : 'mr-8'}`}
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium ${
                message.role === 'user'
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-primary-500 text-white'
              }`}
            >
              {message.role === 'user' ? 'You' : 'AI'}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="relative group rounded-lg overflow-hidden border"
                    >
                      {attachment.type === 'image' && (
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="h-32 w-auto object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Message text */}
              <div
                className={`prose prose-sm max-w-none ${
                  message.role === 'user'
                    ? 'bg-gray-100 rounded-lg px-3 py-2'
                    : ''
                }`}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>

              {/* Streaming indicator */}
              {message.isStreaming && (
                <div className="mt-2 flex items-center gap-1">
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-500">Generating...</span>
                </div>
              )}

              {/* Tool calls */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.toolCalls.map((tool) => (
                    <div
                      key={tool.id}
                      className="text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1"
                    >
                      <span className="font-medium text-blue-700">
                        {tool.name}
                      </span>
                      {tool.status === 'success' && (
                        <span className="ml-2 text-green-600">✓</span>
                      )}
                      {tool.status === 'error' && (
                        <span className="ml-2 text-red-600">✗</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="mb-4 mr-8">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium bg-primary-500 text-white">
              AI
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
                <span className="text-xs text-gray-500 ml-2">Thinking...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
