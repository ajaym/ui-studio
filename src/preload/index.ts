import { contextBridge, ipcRenderer } from 'electron'
import { IPCChannel } from '@shared/types'
import type {
  ChatSendPayload,
  ChatReceivePayload,
  ChatStreamPayload,
  ModeChangePayload,
  AgentMode,
  Project,
  ProjectChangedPayload,
} from '@shared/types'

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const api = {
  // Chat API
  chat: {
    send: (payload: ChatSendPayload) =>
      ipcRenderer.invoke(IPCChannel.CHAT_SEND, payload),

    onReceive: (callback: (payload: ChatReceivePayload) => void) => {
      const listener = (_: unknown, payload: ChatReceivePayload) => callback(payload)
      ipcRenderer.on(IPCChannel.CHAT_RECEIVE, listener)
      return () => ipcRenderer.removeListener(IPCChannel.CHAT_RECEIVE, listener)
    },

    onStream: (callback: (payload: ChatStreamPayload) => void) => {
      const listener = (_: unknown, payload: ChatStreamPayload) => callback(payload)
      ipcRenderer.on(IPCChannel.CHAT_STREAM, listener)
      return () => ipcRenderer.removeListener(IPCChannel.CHAT_STREAM, listener)
    },

    onError: (callback: (error: string) => void) => {
      const listener = (_: unknown, error: string) => callback(error)
      ipcRenderer.on(IPCChannel.CHAT_ERROR, listener)
      return () => ipcRenderer.removeListener(IPCChannel.CHAT_ERROR, listener)
    },
  },

  // Preview API
  preview: {
    onReload: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on(IPCChannel.PREVIEW_RELOAD, listener)
      return () => ipcRenderer.removeListener(IPCChannel.PREVIEW_RELOAD, listener)
    },

    onUrl: (callback: (url: string) => void) => {
      const listener = (_: unknown, url: string) => callback(url)
      ipcRenderer.on(IPCChannel.PREVIEW_URL, listener)
      return () => ipcRenderer.removeListener(IPCChannel.PREVIEW_URL, listener)
    },

    onError: (callback: (error: string) => void) => {
      const listener = (_: unknown, error: string) => callback(error)
      ipcRenderer.on(IPCChannel.PREVIEW_ERROR, listener)
      return () => ipcRenderer.removeListener(IPCChannel.PREVIEW_ERROR, listener)
    },
  },

  // Mode API
  mode: {
    change: (payload: ModeChangePayload) =>
      ipcRenderer.invoke(IPCChannel.MODE_CHANGE, payload),

    list: (): Promise<AgentMode[]> =>
      ipcRenderer.invoke(IPCChannel.MODE_LIST),
  },

  // Project API
  project: {
    list: (): Promise<Project[]> =>
      ipcRenderer.invoke(IPCChannel.PROJECT_LIST),

    open: (projectId: string): Promise<void> =>
      ipcRenderer.invoke(IPCChannel.PROJECT_OPEN, projectId),

    create: (): Promise<void> =>
      ipcRenderer.invoke(IPCChannel.PROJECT_CREATE),

    onChanged: (callback: (payload: ProjectChangedPayload) => void) => {
      const listener = (_: unknown, payload: ProjectChangedPayload) => callback(payload)
      ipcRenderer.on(IPCChannel.PROJECT_CHANGED, listener)
      return () => ipcRenderer.removeListener(IPCChannel.PROJECT_CHANGED, listener)
    },
  },

}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = api
}
