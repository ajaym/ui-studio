import { useState, useEffect } from 'react'
import ChatPanel from './components/ChatPanel/ChatPanel'
import PreviewPanel from './components/PreviewPanel/PreviewPanel'
import SplitPane from './components/Layout/SplitPane'

function App() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Listen for preview URL from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.preview.onUrl((url) => {
      console.log('Received preview URL:', url)
      setPreviewUrl(url)
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
      </header>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <SplitPane
          left={<ChatPanel onPreviewReady={setPreviewUrl} />}
          right={<PreviewPanel url={previewUrl} />}
          defaultSize={50}
        />
      </div>
    </div>
  )
}

export default App
