import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the index module that provides getMainWindow
vi.mock('../index', () => ({
  getMainWindow: vi.fn().mockReturnValue({
    webContents: {
      send: vi.fn(),
    },
  }),
}))

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('mock-id-123'),
}))

// Mock the Anthropic SDK
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate }
    constructor() {}
  }
  return { default: MockAnthropic }
})

import { AgentService } from './AgentService'
import { getMainWindow } from '../index'

describe('AgentService', () => {
  let service: AgentService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AgentService('test-api-key')
  })

  describe('constructor', () => {
    it('should create an instance with API key', () => {
      expect(service).toBeInstanceOf(AgentService)
    })
  })

  describe('initialize', () => {
    it('should set mode and project ID', async () => {
      await service.initialize('mobile-first', 'project-123')
      // History should be cleared
      expect(service.getHistory()).toEqual([])
    })

    it('should clear conversation history on initialize', async () => {
      // Simulate some history
      await service.initialize('rapid-prototype', 'project-1')
      expect(service.getHistory()).toEqual([])

      // Re-initialize
      await service.initialize('mobile-first', 'project-2')
      expect(service.getHistory()).toEqual([])
    })
  })

  describe('clearHistory', () => {
    it('should clear the conversation history', () => {
      service.clearHistory()
      expect(service.getHistory()).toEqual([])
    })
  })

  describe('getHistory', () => {
    it('should return empty array initially', () => {
      expect(service.getHistory()).toEqual([])
    })
  })

  describe('sendMessage', () => {
    beforeEach(async () => {
      await service.initialize('rapid-prototype', 'test-project')
    })

    it('should return early if no main window', async () => {
      vi.mocked(getMainWindow).mockReturnValueOnce(null)
      await service.sendMessage('hello')
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should add user message to history and call API', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Hello back!' }],
      })

      await service.sendMessage('Build me a dashboard')

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 8192,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                { type: 'text', text: 'Build me a dashboard' },
              ]),
            }),
          ]),
        })
      )
    })

    it('should include images in message content when provided', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'I see the image' }],
      })

      await service.sendMessage('What is this?', [
        { data: 'base64data', mimeType: 'image/png' },
      ])

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: 'base64data',
                  },
                },
              ]),
            }),
          ]),
        })
      )
    })

    it('should stream text response to renderer', async () => {
      const mockWindow = {
        webContents: { send: vi.fn() },
      }
      vi.mocked(getMainWindow).mockReturnValue(mockWindow as never)

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Here is your dashboard' }],
      })

      await service.sendMessage('Build me a dashboard')

      // Should have sent stream payloads
      expect(mockWindow.webContents.send).toHaveBeenCalled()
    })

    it('should handle tool use in agentic loop', async () => {
      const mockWindow = {
        webContents: { send: vi.fn() },
      }
      vi.mocked(getMainWindow).mockReturnValue(mockWindow as never)

      // First call returns tool use
      mockCreate.mockResolvedValueOnce({
        content: [
          { type: 'text', text: 'Let me write the file' },
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'write_file',
            input: { path: 'app.jsx', content: '<div>Hello</div>' },
          },
        ],
      })

      // Second call returns text (no more tools)
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Done!' }],
      })

      await service.sendMessage('Build me a dashboard')

      // API should be called twice (first with tool use, second after tool result)
      expect(mockCreate).toHaveBeenCalledTimes(2)
    })

    it('should send error to renderer on API failure', async () => {
      const mockWindow = {
        webContents: { send: vi.fn() },
      }
      vi.mocked(getMainWindow).mockReturnValue(mockWindow as never)

      mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'))

      await service.sendMessage('Hello')

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'chat:error',
        'API rate limit exceeded'
      )
    })

    it('should respect max loop count', async () => {
      const mockWindow = {
        webContents: { send: vi.fn() },
      }
      vi.mocked(getMainWindow).mockReturnValue(mockWindow as never)

      // Always return tool_use to force loop
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'write_file',
            input: { path: 'app.jsx', content: 'loop' },
          },
        ],
      })

      await service.sendMessage('Loop forever')

      // Should cap at 10 iterations
      expect(mockCreate).toHaveBeenCalledTimes(10)
    })
  })

  describe('generateProjectName', () => {
    it('should return generated name from API', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Dashboard App' }],
      })

      const name = await service.generateProjectName('Build me a dashboard with charts')
      expect(name).toBe('Dashboard App')
    })

    it('should return "prototype" on API error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Network error'))

      const name = await service.generateProjectName('Build something')
      expect(name).toBe('prototype')
    })

    it('should use claude-haiku model for name generation', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Test Name' }],
      })

      await service.generateProjectName('test')

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 30,
        })
      )
    })

    it('should trim whitespace from generated name', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '  Whitespace Name  ' }],
      })

      const name = await service.generateProjectName('test')
      expect(name).toBe('Whitespace Name')
    })
  })
})
