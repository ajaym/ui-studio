import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsModal from './SettingsModal'

describe('SettingsModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(<SettingsModal isOpen={false} onClose={mockOnClose} />)
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', async () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    })
  })

  it('should show API key label and description', async () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)
    await waitFor(() => {
      expect(screen.getByText('Anthropic API Key')).toBeInTheDocument()
      expect(screen.getByText(/Required to use the AI agent/)).toBeInTheDocument()
    })
  })

  it('should show password input field', async () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)
    await waitFor(() => {
      const input = screen.getByPlaceholderText('sk-ant-...')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'password')
    })
  })

  it('should show save button', async () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)
    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
  })

  it('should disable save button when input is empty', async () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)
    await waitFor(() => {
      const saveBtn = screen.getByText('Save')
      expect(saveBtn).toBeDisabled()
    })
  })

  it('should enable save button when input has value', async () => {
    const user = userEvent.setup()
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('sk-ant-...')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('sk-ant-...')
    await user.type(input, 'sk-ant-test-key')

    const saveBtn = screen.getByText('Save')
    expect(saveBtn).not.toBeDisabled()
  })

  it('should call apiKey.set when save is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(window.electronAPI.apiKey.set).mockResolvedValue({ success: true })

    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('sk-ant-...')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('sk-ant-...')
    await user.type(input, 'sk-ant-test-key-123')

    await user.click(screen.getByText('Save'))

    expect(window.electronAPI.apiKey.set).toHaveBeenCalledWith({
      apiKey: 'sk-ant-test-key-123',
    })
  })

  it('should show success message after successful save', async () => {
    const user = userEvent.setup()
    vi.mocked(window.electronAPI.apiKey.set).mockResolvedValue({ success: true })

    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('sk-ant-...')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('sk-ant-...')
    await user.type(input, 'sk-ant-test-key')
    await user.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(screen.getByText('API key saved and verified.')).toBeInTheDocument()
    })
  })

  it('should show error message on failed save', async () => {
    const user = userEvent.setup()
    vi.mocked(window.electronAPI.apiKey.set).mockResolvedValue({
      success: false,
      error: 'Invalid API key',
    })

    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('sk-ant-...')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('sk-ant-...')
    await user.type(input, 'bad-key')
    await user.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(screen.getByText('Invalid API key')).toBeInTheDocument()
    })
  })

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    })

    // Click backdrop (the dark overlay behind the modal)
    const backdrop = document.querySelector('.bg-black\\/40')
    expect(backdrop).toBeTruthy()
    await user.click(backdrop!)
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should call onClose when Escape is pressed in input', async () => {
    const user = userEvent.setup()
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('sk-ant-...')).toBeInTheDocument()
    })

    // Focus the input and press Escape
    const input = screen.getByPlaceholderText('sk-ant-...')
    await user.click(input)
    await user.keyboard('{Escape}')
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should load API key status when opened', async () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)
    await waitFor(() => {
      expect(window.electronAPI.apiKey.getStatus).toHaveBeenCalled()
    })
  })

  it('should show active key status when API key is set', async () => {
    vi.mocked(window.electronAPI.apiKey.getStatus).mockResolvedValue({
      isSet: true,
      maskedKey: 'sk-ant-...abc1',
    })

    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText(/Active:/)).toBeInTheDocument()
      expect(screen.getByText('sk-ant-...abc1')).toBeInTheDocument()
    })
  })

  it('should show "No API key configured" when key is not set', async () => {
    vi.mocked(window.electronAPI.apiKey.getStatus).mockResolvedValue({
      isSet: false,
      maskedKey: null,
    })

    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('No API key configured')).toBeInTheDocument()
    })
  })

  it('should show privacy notice', async () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)
    await waitFor(() => {
      expect(screen.getByText(/Your key is stored locally/)).toBeInTheDocument()
    })
  })

  it('should save on Enter key press', async () => {
    const user = userEvent.setup()
    vi.mocked(window.electronAPI.apiKey.set).mockResolvedValue({ success: true })

    render(<SettingsModal isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('sk-ant-...')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('sk-ant-...')
    await user.type(input, 'sk-ant-enter-key')
    await user.keyboard('{Enter}')

    expect(window.electronAPI.apiKey.set).toHaveBeenCalledWith({
      apiKey: 'sk-ant-enter-key',
    })
  })
})
