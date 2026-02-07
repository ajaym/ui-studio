import { useState, useRef, useEffect } from 'react'

interface SplitPaneProps {
  left: React.ReactNode
  right: React.ReactNode
  defaultSize?: number // percentage
  minSize?: number // percentage
  maxSize?: number // percentage
}

export default function SplitPane({
  left,
  right,
  defaultSize = 50,
  minSize = 30,
  maxSize = 70,
}: SplitPaneProps) {
  const [leftWidth, setLeftWidth] = useState(defaultSize)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

      const clampedWidth = Math.min(Math.max(newWidth, minSize), maxSize)
      setLeftWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, minSize, maxSize])

  return (
    <div ref={containerRef} className="flex h-full w-full">
      {/* Left panel */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ width: `${leftWidth}%` }}
      >
        {left}
      </div>

      {/* Divider */}
      <div
        className="w-1 bg-gray-200 hover:bg-primary-500 cursor-col-resize flex-shrink-0 transition-colors"
        onMouseDown={() => setIsDragging(true)}
      />

      {/* Right panel */}
      <div className="flex-1 overflow-hidden">
        {right}
      </div>
    </div>
  )
}
