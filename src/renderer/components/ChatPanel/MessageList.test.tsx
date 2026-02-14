import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MessageList from './MessageList'
import type { Message } from '@shared/types'

describe('MessageList', () => {
  const createMessage = (overrides: Partial<Message> = {}): Message => ({
    id: 'msg-1',
    role: 'user',
    content: 'Hello',
    timestamp: Date.now(),
    ...overrides,
  })

  it('should show welcome message when no messages', () => {
    render(<MessageList messages={[]} isLoading={false} />)
    expect(screen.getByText('Welcome to UI Studio')).toBeInTheDocument()
    expect(
      screen.getByText(/Describe the interface you want to build/)
    ).toBeInTheDocument()
  })

  it('should show example prompts in welcome state', () => {
    render(<MessageList messages={[]} isLoading={false} />)
    expect(
      screen.getByText(/Create a dashboard with user stats/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Build a settings page with form inputs/)
    ).toBeInTheDocument()
  })

  it('should render user messages', () => {
    const messages = [createMessage({ content: 'Build me a todo app' })]
    render(<MessageList messages={messages} isLoading={false} />)
    expect(screen.getByText('Build me a todo app')).toBeInTheDocument()
  })

  it('should render assistant messages with markdown', () => {
    const messages = [
      createMessage({
        id: 'msg-2',
        role: 'assistant',
        content: 'Here is your **bold** text',
      }),
    ]
    render(<MessageList messages={messages} isLoading={false} />)
    // ReactMarkdown renders bold text
    expect(screen.getByText('bold')).toBeInTheDocument()
  })

  it('should show user avatar as "You"', () => {
    const messages = [createMessage()]
    render(<MessageList messages={messages} isLoading={false} />)
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('should show assistant avatar as "AI"', () => {
    const messages = [createMessage({ role: 'assistant' })]
    render(<MessageList messages={messages} isLoading={false} />)
    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  it('should show timestamp for messages', () => {
    const timestamp = new Date(2025, 0, 15, 14, 30, 0).getTime()
    const messages = [createMessage({ timestamp })]
    render(<MessageList messages={messages} isLoading={false} />)
    // Time format depends on locale; just check something is rendered
    const timeElement = document.querySelector('.text-xs.text-gray-500.mb-1')
    expect(timeElement).toBeTruthy()
  })

  it('should show loading indicator when isLoading is true', () => {
    render(<MessageList messages={[]} isLoading={true} />)
    expect(screen.getByText('Thinking...')).toBeInTheDocument()
  })

  it('should not show loading indicator when isLoading is false', () => {
    render(<MessageList messages={[]} isLoading={false} />)
    expect(screen.queryByText('Thinking...')).not.toBeInTheDocument()
  })

  it('should show streaming indicator for streaming messages', () => {
    const messages = [
      createMessage({
        role: 'assistant',
        content: 'Streaming content here',
        isStreaming: true,
      }),
    ]
    render(<MessageList messages={messages} isLoading={false} />)
    // The streaming indicator shows "Generating..." text with a pulsing dot
    const generatingTexts = screen.getAllByText('Generating...')
    expect(generatingTexts.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Streaming content here')).toBeInTheDocument()
  })

  it('should render multiple messages in order', () => {
    const messages = [
      createMessage({ id: '1', role: 'user', content: 'First message' }),
      createMessage({ id: '2', role: 'assistant', content: 'Second message' }),
      createMessage({ id: '3', role: 'user', content: 'Third message' }),
    ]
    render(<MessageList messages={messages} isLoading={false} />)

    expect(screen.getByText('First message')).toBeInTheDocument()
    expect(screen.getByText('Second message')).toBeInTheDocument()
    expect(screen.getByText('Third message')).toBeInTheDocument()
  })

  it('should render message attachments', () => {
    const messages = [
      createMessage({
        attachments: [
          {
            id: 'att-1',
            type: 'image',
            name: 'screenshot.png',
            url: 'blob:test-url',
            mimeType: 'image/png',
            size: 1024,
          },
        ],
      }),
    ]
    render(<MessageList messages={messages} isLoading={false} />)
    const img = screen.getByAltText('screenshot.png')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'blob:test-url')
  })

  it('should render tool calls', () => {
    const messages = [
      createMessage({
        role: 'assistant',
        toolCalls: [
          { id: 'tc-1', name: 'write_file', input: {}, status: 'success' },
          { id: 'tc-2', name: 'read_file', input: {}, status: 'error' },
        ],
      }),
    ]
    render(<MessageList messages={messages} isLoading={false} />)
    expect(screen.getByText('write_file')).toBeInTheDocument()
    expect(screen.getByText('read_file')).toBeInTheDocument()
  })
})
