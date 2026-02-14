import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock window.electronAPI for renderer tests
const mockElectronAPI = {
  chat: {
    send: vi.fn().mockResolvedValue({ success: true }),
    onReceive: vi.fn().mockReturnValue(vi.fn()),
    onStream: vi.fn().mockReturnValue(vi.fn()),
    onError: vi.fn().mockReturnValue(vi.fn()),
  },
  preview: {
    onReload: vi.fn().mockReturnValue(vi.fn()),
    onUrl: vi.fn().mockReturnValue(vi.fn()),
    onError: vi.fn().mockReturnValue(vi.fn()),
  },
  mode: {
    change: vi.fn().mockResolvedValue({ success: true }),
    list: vi.fn().mockResolvedValue([]),
  },
  project: {
    list: vi.fn().mockResolvedValue([]),
    open: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(undefined),
    onChanged: vi.fn().mockReturnValue(vi.fn()),
  },
  apiKey: {
    getStatus: vi.fn().mockResolvedValue({ isSet: false, maskedKey: null }),
    set: vi.fn().mockResolvedValue({ success: true }),
  },
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

// Mock URL.createObjectURL and URL.revokeObjectURL
URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
URL.revokeObjectURL = vi.fn()

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn()
