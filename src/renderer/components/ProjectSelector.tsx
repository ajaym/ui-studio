import { useState, useEffect, useRef } from 'react'
import type { Project } from '@shared/types'

interface ProjectSelectorProps {
  currentProject: Project | null
}

export default function ProjectSelector({ currentProject }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchProjects = async () => {
    const list = await window.electronAPI.project.list()
    setProjects(list)
  }

  const handleToggle = () => {
    if (!isOpen) {
      fetchProjects()
    }
    setIsOpen(!isOpen)
  }

  const handleNewPrototype = async () => {
    setIsOpen(false)
    await window.electronAPI.project.create()
  }

  const handleOpenProject = async (projectId: string) => {
    setIsOpen(false)
    await window.electronAPI.project.open(projectId)
  }

  const displayName = currentProject ? currentProject.name : 'New Prototype'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
      >
        <span className="truncate max-w-[200px]">{displayName}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={handleNewPrototype}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-primary-600 font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Prototype
          </button>

          {projects.length > 0 && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <div className="max-h-64 overflow-y-auto">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleOpenProject(project.id)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                      currentProject?.id === project.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate">{project.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {formatDate(project.createdAt)}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
