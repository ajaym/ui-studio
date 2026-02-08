// Project types
export interface Project {
  id: string
  name: string
  createdAt: number
  path: string
}

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
export interface AgentMode {
  id: string
  name: string
  description: string
  systemPrompt: string
  defaultViewport: ViewportSize
  mockDataStyle: 'minimal' | 'realistic' | 'extensive'
}

export type ViewportSize = 'mobile' | 'tablet' | 'desktop'

// IPC channel names
export enum IPCChannel {
  CHAT_SEND = 'chat:send',
  CHAT_RECEIVE = 'chat:receive',
  CHAT_STREAM = 'chat:stream',
  CHAT_ERROR = 'chat:error',

  PREVIEW_RELOAD = 'preview:reload',
  PREVIEW_URL = 'preview:url',
  PREVIEW_ERROR = 'preview:error',

  MODE_CHANGE = 'mode:change',
  MODE_LIST = 'mode:list',

  PROJECT_LIST = 'project:list',
  PROJECT_OPEN = 'project:open',
  PROJECT_CREATE = 'project:create',
  PROJECT_CHANGED = 'project:changed',

  APIKEY_GET = 'apikey:get',
  APIKEY_SET = 'apikey:set',
  APIKEY_STATUS = 'apikey:status',
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

export interface ModeChangePayload {
  modeId: string
}

export interface ProjectChangedPayload {
  project: Project | null
  previewUrl: string | null
}

export interface ApiKeyStatus {
  isSet: boolean
  maskedKey: string | null // e.g. "sk-ant-...abc123"
}

export interface ApiKeySetPayload {
  apiKey: string
}
