import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatInput from './ChatInput'

describe('ChatInput', () => {
  const mockOnSend = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render textarea with placeholder', () => {
    render(<ChatInput onSend={mockOnSend} />)
    expect(
      screen.getByPlaceholderText('Describe the UI you want to build...')
    ).toBeInTheDocument()
  })

  it('should render send button', () => {
    render(<ChatInput onSend={mockOnSend} />)
    expect(screen.getByTitle('Send message')).toBeInTheDocument()
  })

  it('should render attach button', () => {
    render(<ChatInput onSend={mockOnSend} />)
    expect(screen.getByTitle('Attach image')).toBeInTheDocument()
  })

  it('should render keyboard shortcut hints', () => {
    render(<ChatInput onSend={mockOnSend} />)
    expect(screen.getByText('Enter')).toBeInTheDocument()
    expect(screen.getByText('Shift+Enter')).toBeInTheDocument()
  })

  it('should call onSend when Enter is pressed', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={mockOnSend} />)

    const input = screen.getByPlaceholderText('Describe the UI you want to build...')
    await user.type(input, 'Hello')
    await user.keyboard('{Enter}')

    expect(mockOnSend).toHaveBeenCalledWith('Hello', undefined)
  })

  it('should NOT call onSend when Shift+Enter is pressed', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={mockOnSend} />)

    const input = screen.getByPlaceholderText('Describe the UI you want to build...')
    await user.type(input, 'Hello')
    await user.keyboard('{Shift>}{Enter}{/Shift}')

    expect(mockOnSend).not.toHaveBeenCalled()
  })

  it('should NOT call onSend with empty message', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={mockOnSend} />)

    const input = screen.getByPlaceholderText('Describe the UI you want to build...')
    await user.click(input)
    await user.keyboard('{Enter}')

    expect(mockOnSend).not.toHaveBeenCalled()
  })

  it('should NOT call onSend with only whitespace', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={mockOnSend} />)

    const input = screen.getByPlaceholderText('Describe the UI you want to build...')
    await user.type(input, '   ')
    await user.keyboard('{Enter}')

    expect(mockOnSend).not.toHaveBeenCalled()
  })

  it('should clear input after sending', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={mockOnSend} />)

    const input = screen.getByPlaceholderText('Describe the UI you want to build...') as HTMLTextAreaElement
    await user.type(input, 'Test message')
    await user.keyboard('{Enter}')

    expect(input.value).toBe('')
  })

  it('should disable input when disabled prop is true', () => {
    render(<ChatInput onSend={mockOnSend} disabled />)

    const input = screen.getByPlaceholderText('Describe the UI you want to build...')
    expect(input).toBeDisabled()
  })

  it('should disable send button when disabled and empty', () => {
    render(<ChatInput onSend={mockOnSend} disabled />)

    const sendBtn = screen.getByTitle('Send message')
    expect(sendBtn).toBeDisabled()
  })

  it('should disable attach button when disabled', () => {
    render(<ChatInput onSend={mockOnSend} disabled />)

    const attachBtn = screen.getByTitle('Attach image')
    expect(attachBtn).toBeDisabled()
  })

  it('should NOT call onSend when disabled', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={mockOnSend} disabled />)

    const sendBtn = screen.getByTitle('Send message')
    await user.click(sendBtn)

    expect(mockOnSend).not.toHaveBeenCalled()
  })

  it('should call onSend when send button is clicked', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={mockOnSend} />)

    const input = screen.getByPlaceholderText('Describe the UI you want to build...')
    await user.type(input, 'Click send test')

    const sendBtn = screen.getByTitle('Send message')
    await user.click(sendBtn)

    expect(mockOnSend).toHaveBeenCalledWith('Click send test', undefined)
  })
})
