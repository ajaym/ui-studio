import type {
  ChatSendPayload,
  ChatReceivePayload,
  ChatStreamPayload,
  ModeChangePayload,
  AgentMode,
} from '@shared/types'

export interface ElectronAPI {
  chat: {
    send: (payload: ChatSendPayload) => Promise<{ success: boolean }>
    onReceive: (callback: (payload: ChatReceivePayload) => void) => () => void
    onStream: (callback: (payload: ChatStreamPayload) => void) => () => void
    onError: (callback: (error: string) => void) => () => void
  }
  preview: {
    onReload: (callback: () => void) => () => void
    onUrl: (callback: (url: string) => void) => () => void
    onError: (callback: (error: string) => void) => () => void
  }
  mode: {
    change: (payload: ModeChangePayload) => Promise<{ success: boolean }>
    list: () => Promise<AgentMode[]>
  }
  config: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
