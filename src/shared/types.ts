// Message types
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  attachments?: Attachment[]
  toolCalls?: ToolCall[]
  isStreaming?: boolean
}

export interface Attachment {
  id: string
  type: 'image' | 'file'
  name: string
  url: string
  mimeType: string
  size: number
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  status: 'pending' | 'success' | 'error'
  result?: string
}

// Agent types
export interface AgentConfig {
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

export interface AgentMode {
  id: string
  name: string
  description: string
  systemPrompt: string
  defaultViewport: ViewportSize
  mockDataStyle: 'minimal' | 'realistic' | 'extensive'
}

export type ViewportSize = 'mobile' | 'tablet' | 'desktop'

// Project types
export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  mode: string
  files: ProjectFile[]
}

export interface ProjectFile {
  path: string
  content: string
  language: string
}

// IPC channel names
export enum IPCChannel {
  // Chat
  CHAT_SEND = 'chat:send',
  CHAT_RECEIVE = 'chat:receive',
  CHAT_STREAM = 'chat:stream',
  CHAT_ERROR = 'chat:error',

  // Preview
  PREVIEW_RELOAD = 'preview:reload',
  PREVIEW_URL = 'preview:url',
  PREVIEW_ERROR = 'preview:error',

  // Mode
  MODE_CHANGE = 'mode:change',
  MODE_LIST = 'mode:list',

  // Project
  PROJECT_CREATE = 'project:create',
  PROJECT_LOAD = 'project:load',
  PROJECT_SAVE = 'project:save',

  // Config
  CONFIG_GET = 'config:get',
  CONFIG_SET = 'config:set',
}

// IPC payload types
export interface ChatSendPayload {
  message: string
  attachments?: Attachment[]
}

export interface ChatReceivePayload {
  message: Message
}

export interface ChatStreamPayload {
  messageId: string
  delta: string
  isComplete: boolean
}

export interface PreviewReloadPayload {
  projectId: string
}

export interface ModeChangePayload {
  modeId: string
}
