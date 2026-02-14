import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatPanel from './ChatPanel'

describe('ChatPanel', () => {
  const mockOnPreviewReady = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the welcome message when no messages', () => {
    render(<ChatPanel onPreviewReady={mockOnPreviewReady} />)
    expect(screen.getByText('Welcome to UI Studio')).toBeInTheDocument()
  })

  it('should render the chat input', () => {
    render(<ChatPanel onPreviewReady={mockOnPreviewReady} />)
    expect(
      screen.getByPlaceholderText('Describe the UI you want to build...')
    ).toBeInTheDocument()
  })

  it('should register IPC listeners on mount', () => {
    render(<ChatPanel onPreviewReady={mockOnPreviewReady} />)
    expect(window.electronAPI.chat.onReceive).toHaveBeenCalled()
    expect(window.electronAPI.chat.onStream).toHaveBeenCalled()
    expect(window.electronAPI.chat.onError).toHaveBeenCalled()
  })

  it('should unsubscribe IPC listeners on unmount', () => {
    const mockUnsub = vi.fn()
    vi.mocked(window.electronAPI.chat.onReceive).mockReturnValue(mockUnsub)
    vi.mocked(window.electronAPI.chat.onStream).mockReturnValue(mockUnsub)
    vi.mocked(window.electronAPI.chat.onError).mockReturnValue(mockUnsub)

    const { unmount } = render(<ChatPanel onPreviewReady={mockOnPreviewReady} />)
    unmount()

    expect(mockUnsub).toHaveBeenCalledTimes(3)
  })

  it('should send message when user types and presses Enter', async () => {
    const user = userEvent.setup()
    render(<ChatPanel onPreviewReady={mockOnPreviewReady} />)

    const input = screen.getByPlaceholderText('Describe the UI you want to build...')
    await user.type(input, 'Build me a dashboard')
    await user.keyboard('{Enter}')

    expect(window.electronAPI.chat.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Build me a dashboard',
      })
    )
  })

  it('should display user message in the chat', async () => {
    const user = userEvent.setup()
    render(<ChatPanel onPreviewReady={mockOnPreviewReady} />)

    const input = screen.getByPlaceholderText('Describe the UI you want to build...')
    await user.type(input, 'Hello AI')
    await user.keyboard('{Enter}')

    expect(screen.getByText('Hello AI')).toBeInTheDocument()
  })

  it('should show loading state while waiting for response', async () => {
    const user = userEvent.setup()
    render(<ChatPanel onPreviewReady={mockOnPreviewReady} />)

    const input = screen.getByPlaceholderText('Describe the UI you want to build...')
    await user.type(input, 'Test')
    await user.keyboard('{Enter}')

    expect(screen.getByText('Thinking...')).toBeInTheDocument()
  })

  it('should handle streaming messages via IPC callback', () => {
    let streamCallback: ((payload: { messageId: string; delta: string; isComplete: boolean }) => void) | null = null
    vi.mocked(window.electronAPI.chat.onStream).mockImplementation((cb) => {
      streamCallback = cb
      return vi.fn()
    })

    render(<ChatPanel onPreviewReady={mockOnPreviewReady} />)

    // Simulate streaming response
    act(() => {
      streamCallback?.({
        messageId: 'stream-1',
        delta: 'Hello from AI',
        isComplete: false,
      })
    })

    expect(screen.getByText('Hello from AI')).toBeInTheDocument()
    expect(screen.getByText('Generating...')).toBeInTheDocument()
  })

  it('should handle error messages via IPC callback', () => {
    let errorCallback: ((error: string) => void) | null = null
    vi.mocked(window.electronAPI.chat.onError).mockImplementation((cb) => {
      errorCallback = cb
      return vi.fn()
    })

    render(<ChatPanel onPreviewReady={mockOnPreviewReady} />)

    act(() => {
      errorCallback?.('Something went wrong')
    })

    expect(screen.getByText('Error: Something went wrong')).toBeInTheDocument()
  })
})
