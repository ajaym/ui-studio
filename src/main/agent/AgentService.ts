import Anthropic from '@anthropic-ai/sdk'
import { getMainWindow } from '../index'
import { IPCChannel } from '@shared/types'
import type { Message, ChatStreamPayload } from '@shared/types'
import { nanoid } from 'nanoid'
import { getSystemPrompt } from './prompts'
import { getTools, executeToolCall } from './tools'

export class AgentService {
  private client: Anthropic
  private conversationHistory: Anthropic.MessageParam[] = []
  private currentMode: string = 'rapid-prototype'
  private currentProjectId: string | null = null

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    })
  }

  async initialize(mode: string, projectId: string) {
    this.currentMode = mode
    this.currentProjectId = projectId
    this.conversationHistory = []
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

    try {
      const messageId = nanoid()

      // Get system prompt
      const systemPrompt = getSystemPrompt(this.currentMode, this.currentProjectId || '')

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
        const toolUses = response.content.filter((block) => block.type === 'tool_use')

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

      // Send completion
      const payload: ChatStreamPayload = {
        messageId,
        delta: '',
        isComplete: true,
      }
      mainWindow.webContents.send(IPCChannel.CHAT_STREAM, payload)

      // Trigger preview reload after response
      mainWindow.webContents.send(IPCChannel.PREVIEW_RELOAD)
    } catch (error) {
      console.error('Agent error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      mainWindow.webContents.send(IPCChannel.CHAT_ERROR, errorMessage)
    }
  }

  clearHistory() {
    this.conversationHistory = []
  }

  getHistory(): Anthropic.MessageParam[] {
    return this.conversationHistory
  }
}
