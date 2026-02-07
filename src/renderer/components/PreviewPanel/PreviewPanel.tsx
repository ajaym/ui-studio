import { useState, useEffect } from 'react'

interface PreviewPanelProps {
  url: string | null
}

type ViewportSize = 'mobile' | 'tablet' | 'desktop'

const VIEWPORT_SIZES = {
  mobile: { width: 375, height: 667, label: 'Mobile' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  desktop: { width: '100%', height: '100%', label: 'Desktop' },
}

export default function PreviewPanel({ url }: PreviewPanelProps) {
  const [viewport, setViewport] = useState<ViewportSize>('desktop')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  useEffect(() => {
    // Listen for preview reload events
    const unsubscribe = window.electronAPI.preview.onReload(() => {
      setKey((prev) => prev + 1)
    })

    return unsubscribe
  }, [])

  const handleRefresh = () => {
    setKey((prev) => prev + 1)
  }

  const viewportConfig = VIEWPORT_SIZES[viewport]

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="h-12 bg-white border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Viewport selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(Object.keys(VIEWPORT_SIZES) as ViewportSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setViewport(size)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  viewport === size
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {VIEWPORT_SIZES[size].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={!url}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh preview"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {!url ? (
          <div className="text-center text-gray-500">
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-medium">No preview available</p>
            <p className="text-sm mt-1">
              Start chatting to generate a prototype
            </p>
          </div>
        ) : error ? (
          <div className="text-center text-red-600">
            <div className="w-24 h-24 bg-red-50 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-medium">Preview error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : (
          <div
            className="bg-white shadow-lg rounded-lg overflow-hidden"
            style={{
              width: viewportConfig.width,
              height: viewportConfig.height,
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            <iframe
              key={key}
              src={url}
              className="w-full h-full border-0"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false)
                setError('Failed to load preview')
              }}
              title="Preview"
            />

            {isLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                <div className="text-gray-600">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading preview...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
