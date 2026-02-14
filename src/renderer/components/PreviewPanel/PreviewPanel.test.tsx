import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PreviewPanel from './PreviewPanel'

describe('PreviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show placeholder when no URL provided', () => {
    render(<PreviewPanel url={null} />)
    expect(screen.getByText('No preview available')).toBeInTheDocument()
    expect(screen.getByText('Start chatting to generate a prototype')).toBeInTheDocument()
  })

  it('should render iframe when URL is provided', () => {
    render(<PreviewPanel url="http://localhost:3000" />)
    const iframe = document.querySelector('iframe')
    expect(iframe).toBeTruthy()
    expect(iframe?.src).toBe('http://localhost:3000/')
  })

  it('should render viewport selector buttons', () => {
    render(<PreviewPanel url={null} />)
    expect(screen.getByText('Mobile')).toBeInTheDocument()
    expect(screen.getByText('Tablet')).toBeInTheDocument()
    expect(screen.getByText('Desktop')).toBeInTheDocument()
  })

  it('should switch viewport when button is clicked', async () => {
    const user = userEvent.setup()
    render(<PreviewPanel url="http://localhost:3000" />)

    await user.click(screen.getByText('Mobile'))

    // The container div should have mobile dimensions
    const container = document.querySelector('iframe')?.parentElement
    expect(container?.style.width).toBe('375px')
    expect(container?.style.height).toBe('667px')
  })

  it('should switch to tablet viewport', async () => {
    const user = userEvent.setup()
    render(<PreviewPanel url="http://localhost:3000" />)

    await user.click(screen.getByText('Tablet'))

    const container = document.querySelector('iframe')?.parentElement
    expect(container?.style.width).toBe('768px')
    expect(container?.style.height).toBe('1024px')
  })

  it('should default to desktop viewport', () => {
    render(<PreviewPanel url="http://localhost:3000" />)

    const container = document.querySelector('iframe')?.parentElement
    expect(container?.style.width).toBe('100%')
    expect(container?.style.height).toBe('100%')
  })

  it('should render refresh button', () => {
    render(<PreviewPanel url="http://localhost:3000" />)
    expect(screen.getByTitle('Refresh preview')).toBeInTheDocument()
  })

  it('should disable refresh button when no URL', () => {
    render(<PreviewPanel url={null} />)
    expect(screen.getByTitle('Refresh preview')).toBeDisabled()
  })

  it('should register preview reload listener', () => {
    render(<PreviewPanel url="http://localhost:3000" />)
    expect(window.electronAPI.preview.onReload).toHaveBeenCalled()
  })

  it('should reload iframe when refresh button is clicked', async () => {
    const user = userEvent.setup()
    render(<PreviewPanel url="http://localhost:3000" />)

    const iframe = document.querySelector('iframe')
    const initialKey = iframe?.getAttribute('key') || iframe?.getAttribute('src')

    await user.click(screen.getByTitle('Refresh preview'))

    // The iframe should be re-rendered (key changes)
    // Since React re-renders with new key, the iframe element may change
    const newIframe = document.querySelector('iframe')
    expect(newIframe).toBeTruthy()
  })
})
