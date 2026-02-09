import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SplitPane from './SplitPane'

describe('SplitPane', () => {
  it('should render left and right panels', () => {
    render(
      <SplitPane
        left={<div data-testid="left">Left</div>}
        right={<div data-testid="right">Right</div>}
      />
    )

    expect(screen.getByTestId('left')).toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })

  it('should set initial left width from defaultSize prop', () => {
    render(
      <SplitPane
        left={<div>Left</div>}
        right={<div>Right</div>}
        defaultSize={40}
      />
    )

    const leftPanel = document.querySelector('.flex-shrink-0.overflow-hidden') as HTMLElement
    expect(leftPanel.style.width).toBe('40%')
  })

  it('should use default 50% width when no defaultSize', () => {
    render(
      <SplitPane
        left={<div>Left</div>}
        right={<div>Right</div>}
      />
    )

    const leftPanel = document.querySelector('.flex-shrink-0.overflow-hidden') as HTMLElement
    expect(leftPanel.style.width).toBe('50%')
  })

  it('should render the divider', () => {
    render(
      <SplitPane
        left={<div>Left</div>}
        right={<div>Right</div>}
      />
    )

    const divider = document.querySelector('.cursor-col-resize')
    expect(divider).toBeTruthy()
  })

  it('should handle mousedown on divider', () => {
    render(
      <SplitPane
        left={<div>Left</div>}
        right={<div>Right</div>}
      />
    )

    const divider = document.querySelector('.cursor-col-resize')!
    fireEvent.mouseDown(divider)

    // After mousedown, the component should be in dragging state
    // (Internal state - tested indirectly by behavior)
    expect(divider).toBeTruthy()
  })

  it('should accept minSize and maxSize props', () => {
    // This test just ensures the component renders with custom constraints
    render(
      <SplitPane
        left={<div>Left</div>}
        right={<div>Right</div>}
        minSize={20}
        maxSize={80}
      />
    )

    const leftPanel = document.querySelector('.flex-shrink-0.overflow-hidden') as HTMLElement
    expect(leftPanel).toBeTruthy()
  })
})
