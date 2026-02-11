import { useState, useEffect } from 'react'
import ChatPanel from './components/ChatPanel/ChatPanel'
import PreviewPanel from './components/PreviewPanel/PreviewPanel'
import SplitPane from './components/Layout/SplitPane'
import ProjectSelector from './components/ProjectSelector'
import SettingsModal from './components/SettingsModal'
import type { Project } from '@shared/types'

function App() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [chatResetKey, setChatResetKey] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Listen for preview URL from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.preview.onUrl((url) => {
      console.log('Received preview URL:', url)
      setPreviewUrl(url)
    })

    return unsubscribe
  }, [])

  // Listen for project changes
  useEffect(() => {
    const unsubscribe = window.electronAPI.project.onChanged((payload) => {
      setCurrentProject((prev) => {
        // Only reset chat when explicitly switching projects or creating new,
        // not when the first message auto-creates a project (null → project)
        const isExplicitSwitch = prev !== null || payload.project === null
        if (isExplicitSwitch) {
          setChatResetKey((k) => k + 1)
        }
        return payload.project
      })
      setPreviewUrl(payload.previewUrl)
    })

    return unsubscribe
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100">
      {/* Header - draggable title bar with space for macOS traffic lights */}
      <header className="header-drag-region h-12 bg-white border-b flex items-center pr-4 flex-shrink-0" style={{ paddingLeft: '84px' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">UI</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-800">UI Studio</h1>
        </div>
        <div className="ml-4 header-no-drag">
          <ProjectSelector currentProject={currentProject} />
        </div>
        <div className="ml-auto header-no-drag">
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" />
              <path d="M17.4 12.3a1.3 1.3 0 00.26 1.43l.05.05a1.58 1.58 0 01-1.12 2.7 1.58 1.58 0 01-1.12-.46l-.05-.05a1.3 1.3 0 00-1.43-.26 1.3 1.3 0 00-.79 1.19v.14a1.58 1.58 0 01-3.16 0v-.07a1.3 1.3 0 00-.85-1.19 1.3 1.3 0 00-1.43.26l-.05.05a1.58 1.58 0 01-2.24-2.24l.05-.05a1.3 1.3 0 00.26-1.43 1.3 1.3 0 00-1.19-.79h-.14a1.58 1.58 0 010-3.16h.07a1.3 1.3 0 001.19-.85 1.3 1.3 0 00-.26-1.43l-.05-.05a1.58 1.58 0 012.24-2.24l.05.05a1.3 1.3 0 001.43.26h.06a1.3 1.3 0 00.79-1.19v-.14a1.58 1.58 0 013.16 0v.07a1.3 1.3 0 00.79 1.19 1.3 1.3 0 001.43-.26l.05-.05a1.58 1.58 0 012.24 2.24l-.05.05a1.3 1.3 0 00-.26 1.43v.06a1.3 1.3 0 001.19.79h.14a1.58 1.58 0 010 3.16h-.07a1.3 1.3 0 00-1.19.79z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Settings modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <SplitPane
          left={<ChatPanel key={chatResetKey} onPreviewReady={setPreviewUrl} projectId={currentProject?.id ?? null} />}
          right={<PreviewPanel url={previewUrl} />}
          defaultSize={50}
        />
      </div>
    </div>
  )
}

export default App
