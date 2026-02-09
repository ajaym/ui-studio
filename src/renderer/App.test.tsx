import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the app header with title', () => {
    render(<App />)
    expect(screen.getByText('UI Studio')).toBeInTheDocument()
  })

  it('should render the UI logo', () => {
    render(<App />)
    // The logo has "UI" text in multiple places (icon + title prefix)
    const uiTexts = screen.getAllByText('UI', { exact: true })
    expect(uiTexts.length).toBeGreaterThanOrEqual(1)
  })

  it('should render settings button', () => {
    render(<App />)
    expect(screen.getByTitle('Settings')).toBeInTheDocument()
  })

  it('should open settings modal when settings button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    const settingsBtn = screen.getByTitle('Settings')
    await user.click(settingsBtn)

    // Settings modal should be visible
    expect(screen.getByText('Anthropic API Key')).toBeInTheDocument()
  })

  it('should register IPC listeners on mount', () => {
    render(<App />)
    expect(window.electronAPI.preview.onUrl).toHaveBeenCalled()
    expect(window.electronAPI.project.onChanged).toHaveBeenCalled()
  })

  it('should render project selector', () => {
    render(<App />)
    expect(screen.getByText('New Prototype')).toBeInTheDocument()
  })

  it('should render chat panel with welcome message', () => {
    render(<App />)
    expect(screen.getByText('Welcome to UI Studio')).toBeInTheDocument()
  })

  it('should render preview panel placeholder', () => {
    render(<App />)
    expect(screen.getByText('No preview available')).toBeInTheDocument()
  })
})
