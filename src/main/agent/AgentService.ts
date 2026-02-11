import Anthropic from '@anthropic-ai/sdk'
import { getMainWindow } from '../index'
import { IPCChannel } from '@shared/types'
import type { Message, ChatStreamPayload } from '@shared/types'
import { nanoid } from 'nanoid'
import { getSystemPrompt } from './prompts'
import { getTools, executeToolCall } from './tools'
import { MemoryStore } from './memory/MemoryStore'

/** Number of conversation turns after which we auto-generate a project summary. */
const SUMMARY_THRESHOLD = 20

export class AgentService {
  private client: Anthropic
  private conversationHistory: Anthropic.MessageParam[] = []
  private currentMode: string = 'rapid-prototype'
  private currentProjectId: string | null = null
  private memoryStore: MemoryStore
  private projectSummary: string | null = null
  private projectKeyFacts: string[] = []
  /** Chat messages tracked so we can persist them alongside API history. */
  private chatMessages: Message[] = []

  constructor(apiKey: string, memoryStore: MemoryStore) {
    this.client = new Anthropic({
      apiKey,
    })
    this.memoryStore = memoryStore
  }

  async initialize(mode: string, projectId: string) {
    this.currentMode = mode
    this.currentProjectId = projectId

    // Attempt to restore memory from disk
    const memory = this.memoryStore.loadProjectMemory(projectId)
    if (memory) {
      this.conversationHistory = memory.conversationHistory
      this.chatMessages = memory.chatMessages
      this.projectSummary = memory.summary
      this.projectKeyFacts = memory.keyFacts
      console.log(
        `Restored memory for project ${projectId}: ${this.conversationHistory.length} history entries, ${this.chatMessages.length} chat messages`
      )
    } else {
      this.conversationHistory = []
      this.chatMessages = []
      this.projectSummary = null
      this.projectKeyFacts = []
    }
  }

  async sendMessage(userMessage: string, images?: { data: string; mimeType: string }[]) {
    const mainWindow = getMainWindow()
    if (!mainWindow) return

    // Build message content
    const content: Anthropic.MessageParam['content'] = []

    // Add images if provided
    if (images && images.length > 0) {
      for (const image of images) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: image.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: image.data,
          },
        })
      }
    }

    // Add text
    content.push({
      type: 'text',
      text: userMessage,
    })

    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content,
    })

    // Track user chat message for persistence
    this.chatMessages.push({
      id: nanoid(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    })

    try {
      const messageId = nanoid()

      // Get system prompt (now includes memory context)
      const globalMemory = this.memoryStore.loadGlobalMemory()
      const systemPrompt = getSystemPrompt(
        this.currentMode,
        this.currentProjectId || '',
        this.projectSummary,
        this.projectKeyFacts,
        globalMemory.entries
      )

      // Agentic loop - keep calling until no more tool use
      let continueLoop = true
      let loopCount = 0
      const maxLoops = 10

      while (continueLoop && loopCount < maxLoops) {
        loopCount++

        // Make request
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 8192,
          system: systemPrompt,
          messages: this.conversationHistory,
          tools: getTools(),
        })

        // Add assistant response to history
        this.conversationHistory.push({
          role: 'assistant',
          content: response.content,
        })

        // Check if there are tool uses
        const toolUses = response.content.filter(
          (block: Anthropic.ContentBlock) => block.type === 'tool_use'
        )

        if (toolUses.length === 0) {
          // No tool uses, extract text and finish
          let textResponse = ''
          for (const block of response.content) {
            if (block.type === 'text') {
              textResponse += block.text
            }
          }

          // Send the response to the renderer
          if (textResponse) {
            const payload: ChatStreamPayload = {
              messageId,
              delta: textResponse,
              isComplete: true,
            }
            mainWindow.webContents.send(IPCChannel.CHAT_STREAM, payload)
          }

          continueLoop = false
        } else {
          // Execute tools
          const toolResults: Anthropic.MessageParam['content'] = []

          for (const toolUse of toolUses) {
            if (toolUse.type === 'tool_use') {
              console.log(`Executing tool: ${toolUse.name}`)

              const result = await executeToolCall(
                toolUse.name,
                toolUse.input as Record<string, unknown>,
                this.currentProjectId || ''
              )

              console.log(`Tool result: ${result}`)

              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: result,
              })
            }
          }

          // Add tool results to conversation
          this.conversationHistory.push({
            role: 'user',
            content: toolResults,
          })

          // Continue loop to get next response
        }

        // Also send any text in this response
        for (const block of response.content) {
          if (block.type === 'text' && block.text.trim()) {
            const payload: ChatStreamPayload = {
              messageId,
              delta: block.text,
              isComplete: false,
            }
            mainWindow.webContents.send(IPCChannel.CHAT_STREAM, payload)
          }
        }
      }

      // Collect the full assistant text from the conversation history for persistence
      let fullAssistantText = ''
      for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
        const entry = this.conversationHistory[i]
        if (entry.role === 'assistant' && Array.isArray(entry.content)) {
          for (const block of entry.content) {
            if ('type' in block && block.type === 'text') {
              fullAssistantText = (block as Anthropic.TextBlock).text + '\n' + fullAssistantText
            }
          }
        } else if (entry.role === 'user') {
          // Stop at the last user message (the one we just sent)
          break
        }
      }
      if (fullAssistantText.trim()) {
        this.chatMessages.push({
          id: messageId,
          role: 'assistant',
          content: fullAssistantText.trim(),
          timestamp: Date.now(),
        })
      }

      // Send completion
      const payload: ChatStreamPayload = {
        messageId,
        delta: '',
        isComplete: true,
      }
      mainWindow.webContents.send(IPCChannel.CHAT_STREAM, payload)

      // Trigger preview reload after response
      mainWindow.webContents.send(IPCChannel.PREVIEW_RELOAD)

      // Persist memory after each turn
      this.persistMemory()

      // Auto-generate summary if history is getting long
      if (
        this.conversationHistory.length >= SUMMARY_THRESHOLD &&
        !this.projectSummary
      ) {
        this.generateProjectSummary().catch((err) =>
          console.error('Failed to generate project summary:', err)
        )
      }
    } catch (error) {
      console.error('Agent error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      mainWindow.webContents.send(IPCChannel.CHAT_ERROR, errorMessage)
    }
  }

  async generateProjectName(userMessage: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 30,
        messages: [
          {
            role: 'user',
            content: `Give a short 2-4 word name for a UI prototype based on this request. Reply with ONLY the name, nothing else.\n\n"${userMessage}"`,
          },
        ],
      })

      const text = response.content[0]
      if (text.type === 'text') {
        return text.text.trim()
      }
    } catch (error) {
      console.error('Failed to generate project name:', error)
    }
    return 'prototype'
  }

  clearHistory() {
    this.conversationHistory = []
    this.chatMessages = []
    this.projectSummary = null
    this.projectKeyFacts = []
  }

  getHistory(): Anthropic.MessageParam[] {
    return this.conversationHistory
  }

  getChatMessages(): Message[] {
    return this.chatMessages
  }

  setChatMessages(messages: Message[]) {
    this.chatMessages = messages
  }

  getMemoryStore(): MemoryStore {
    return this.memoryStore
  }

  // ---- Private helpers ----

  private persistMemory(): void {
    if (!this.currentProjectId) return

    this.memoryStore.saveProjectMemory(
      this.currentProjectId,
      this.conversationHistory,
      this.chatMessages,
      this.projectSummary,
      this.projectKeyFacts
    )
  }

  private async generateProjectSummary(): Promise<void> {
    try {
      // Build a condensed version of the conversation for summarization
      const historyText = this.conversationHistory
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(0, 20) // First 20 turns for summary
        .map((m) => {
          if (typeof m.content === 'string') return m.content
          if (Array.isArray(m.content)) {
            return (m.content as Anthropic.ContentBlock[])
              .filter((b: Anthropic.ContentBlock): b is Anthropic.TextBlock => b.type === 'text')
              .map((b: Anthropic.TextBlock) => b.text)
              .join(' ')
          }
          return ''
        })
        .filter(Boolean)
        .join('\n---\n')

      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Summarize this prototype development conversation in 2-3 sentences. Focus on: what was built, key design decisions, and the current state of the prototype.\n\n${historyText}`,
          },
        ],
      })

      const text = response.content[0]
      if (text.type === 'text') {
        const summary = text.text.trim()
        this.projectSummary = summary
        if (this.currentProjectId) {
          this.memoryStore.updateProjectSummary(this.currentProjectId, summary)
        }
        console.log('Generated project summary:', this.projectSummary)
      }
    } catch (error) {
      console.error('Failed to generate project summary:', error)
    }
  }
}
