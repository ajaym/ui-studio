import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectSelector from './ProjectSelector'
import type { Project } from '@shared/types'

describe('ProjectSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show "New Prototype" when no project selected', () => {
    render(<ProjectSelector currentProject={null} />)
    expect(screen.getByText('New Prototype')).toBeInTheDocument()
  })

  it('should show project name when project is selected', () => {
    const project: Project = {
      id: 'test-project',
      name: 'My Dashboard',
      createdAt: Date.now(),
      path: '/test/path',
    }
    render(<ProjectSelector currentProject={project} />)
    expect(screen.getByText('My Dashboard')).toBeInTheDocument()
  })

  it('should open dropdown when clicked', async () => {
    const user = userEvent.setup()
    render(<ProjectSelector currentProject={null} />)

    await user.click(screen.getByText('New Prototype'))

    // Dropdown should show the "New Prototype" create button (a second one)
    const allNewPrototype = screen.getAllByText('New Prototype')
    expect(allNewPrototype.length).toBeGreaterThanOrEqual(2)
  })

  it('should fetch projects when dropdown opens', async () => {
    const user = userEvent.setup()
    const mockProjects: Project[] = [
      { id: 'p1', name: 'Project 1', createdAt: Date.now(), path: '/p1' },
      { id: 'p2', name: 'Project 2', createdAt: Date.now() - 86400000, path: '/p2' },
    ]
    vi.mocked(window.electronAPI.project.list).mockResolvedValue(mockProjects)

    render(<ProjectSelector currentProject={null} />)
    await user.click(screen.getByText('New Prototype'))

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument()
      expect(screen.getByText('Project 2')).toBeInTheDocument()
    })
  })

  it('should call project.create when "New Prototype" is clicked in dropdown', async () => {
    const user = userEvent.setup()
    render(<ProjectSelector currentProject={null} />)

    await user.click(screen.getByText('New Prototype'))

    // Find the "New Prototype" button inside dropdown (the one with w-full class)
    const allButtons = screen.getAllByRole('button')
    const createButton = allButtons.find(
      (b) => b.classList.contains('w-full') && b.textContent?.includes('New Prototype')
    )
    expect(createButton).toBeTruthy()
    await user.click(createButton!)
    expect(window.electronAPI.project.create).toHaveBeenCalled()
  })

  it('should call project.open when a project is selected', async () => {
    const user = userEvent.setup()
    const mockProjects: Project[] = [
      { id: 'project-abc', name: 'Test Project', createdAt: Date.now(), path: '/test' },
    ]
    vi.mocked(window.electronAPI.project.list).mockResolvedValue(mockProjects)

    render(<ProjectSelector currentProject={null} />)
    await user.click(screen.getByText('New Prototype'))

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Test Project'))
    expect(window.electronAPI.project.open).toHaveBeenCalledWith('project-abc')
  })

  it('should close dropdown when clicking outside', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <ProjectSelector currentProject={null} />
        <div data-testid="outside">Outside</div>
      </div>
    )

    // Open dropdown
    await user.click(screen.getByText('New Prototype'))
    // Verify dropdown is open
    const allNewPrototype = screen.getAllByText('New Prototype')
    expect(allNewPrototype.length).toBeGreaterThanOrEqual(2)

    // Click outside
    await user.click(screen.getByTestId('outside'))

    // Dropdown should be closed
    await waitFor(() => {
      const items = screen.getAllByText('New Prototype')
      expect(items.length).toBe(1) // Only the header button remains
    })
  })

  it('should highlight current project in dropdown', async () => {
    const user = userEvent.setup()
    const currentProject: Project = {
      id: 'current-project',
      name: 'Current Project',
      createdAt: Date.now(),
      path: '/current',
    }
    const mockProjects: Project[] = [
      currentProject,
      { id: 'other', name: 'Other Project', createdAt: Date.now(), path: '/other' },
    ]
    vi.mocked(window.electronAPI.project.list).mockResolvedValue(mockProjects)

    render(<ProjectSelector currentProject={currentProject} />)
    await user.click(screen.getByText('Current Project'))

    await waitFor(() => {
      // Find the dropdown button that has bg-primary-50 class (current project highlight)
      const highlightedButton = document.querySelector('button.bg-primary-50')
      expect(highlightedButton).toBeTruthy()
      expect(highlightedButton?.textContent).toContain('Current Project')
    })
  })
})
