import { app, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config as dotenvConfig } from 'dotenv'
import { existsSync } from 'fs'
import { IPCChannel } from '@shared/types'
import { getAppDataDir, getSavedApiKey, saveApiKey, maskApiKey } from '@shared/constants'
import type { ChatSendPayload, ModeChangePayload, ApiKeyStatus, ApiKeySetPayload } from '@shared/types'
import { AgentService } from './agent/AgentService'
import { ProjectManager } from './project/ProjectManager'
import { StaticServer } from './preview/StaticServer'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env file.
// In a packaged app, check next to the executable first, then userData dir.
const envCandidates = [
  join(process.cwd(), '.env'),
  join(getAppDataDir(), '.env'),
]
for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    dotenvConfig({ path: envPath })
    break
  }
}

let mainWindow: BrowserWindow | null = null
let agentService: AgentService | null = null
let projectManager: ProjectManager | null = null
let staticServer: StaticServer | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
  })

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App lifecycle
app.whenReady().then(async () => {
  // Initialize services
  await initializeServices()

  setupIPC()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Clean up static server
  if (staticServer) {
    staticServer.stop()
  }

  // Always quit - this is a dev tool, not a traditional Mac app
  app.quit()
})

async function initializeServices() {
  // Initialize project manager
  projectManager = new ProjectManager()

  // Initialize static server
  staticServer = new StaticServer()

  // Initialize agent service — check env var first, then saved config
  const apiKey = process.env.ANTHROPIC_API_KEY || getSavedApiKey()
  if (!apiKey) {
    console.log('No API key found. Users can set it via Settings in the app.')
    // Continue anyway — the settings screen will prompt them
  } else {
    agentService = new AgentService(apiKey)
    console.log('Agent service initialized')
  }
}

// IPC handlers
function setupIPC() {
  // Chat handlers
  ipcMain.handle(IPCChannel.CHAT_SEND, async (_, payload: ChatSendPayload) => {
    console.log('Received chat message:', payload.message)

    if (!agentService) {
      const errorMsg = 'Agent service not initialized. Please set ANTHROPIC_API_KEY.'
      mainWindow?.webContents.send(IPCChannel.CHAT_ERROR, errorMsg)
      return { success: false, error: errorMsg }
    }

    if (!projectManager) {
      const errorMsg = 'Project manager not initialized'
      mainWindow?.webContents.send(IPCChannel.CHAT_ERROR, errorMsg)
      return { success: false, error: errorMsg }
    }

    try {
      // Create project if this is the first message
      let project = projectManager.getCurrentProject()
      if (!project) {
        const projectName = await agentService.generateProjectName(payload.message)
        project = projectManager.createProject(projectName)
        console.log('Created new project:', project.id)

        // Start static server (synchronous, no npm install needed)
        const previewUrl = staticServer!.start(project.path)
        console.log('Static server started:', previewUrl)

        // Send preview URL to renderer
        mainWindow?.webContents.send(IPCChannel.PREVIEW_URL, previewUrl)

        // Initialize agent for this project
        await agentService.initialize('rapid-prototype', project.id)

        // Notify renderer of project change
        mainWindow?.webContents.send(IPCChannel.PROJECT_CHANGED, {
          project,
          previewUrl,
        })
      }

      // Process images if attached
      const images = payload.attachments?.map((att) => ({
        data: att.url.split(',')[1], // Remove data:image/...;base64, prefix
        mimeType: att.mimeType,
      }))

      // Send message to agent
      await agentService.sendMessage(payload.message, images)

      // Reload preview after agent completes
      setTimeout(() => {
        mainWindow?.webContents.send(IPCChannel.PREVIEW_RELOAD)
      }, 500)

      return { success: true }
    } catch (error) {
      console.error('Error handling chat message:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      mainWindow?.webContents.send(IPCChannel.CHAT_ERROR, errorMsg)
      return { success: false, error: errorMsg }
    }
  })

  // Project handlers
  ipcMain.handle(IPCChannel.PROJECT_LIST, async () => {
    if (!projectManager) return []
    return projectManager.listProjects()
  })

  ipcMain.handle(IPCChannel.PROJECT_OPEN, async (_, projectId: string) => {
    if (!projectManager || !staticServer) return

    const project = projectManager.openProject(projectId)

    // Switch static server to new project path
    const previewUrl = staticServer.start(project.path)
    console.log('Switched to project:', project.id, 'at', previewUrl)

    // Re-initialize agent for this project
    if (agentService) {
      await agentService.initialize('rapid-prototype', project.id)
    }

    // Notify renderer and reload preview iframe
    mainWindow?.webContents.send(IPCChannel.PROJECT_CHANGED, {
      project,
      previewUrl,
    })
    mainWindow?.webContents.send(IPCChannel.PREVIEW_RELOAD)
  })

  ipcMain.handle(IPCChannel.PROJECT_CREATE, async () => {
    if (!projectManager) return

    // Reset state so next CHAT_SEND creates a fresh project
    projectManager.setCurrentProject(null)

    // Clear project path — keep server running to avoid port kill issues
    if (staticServer) {
      staticServer.clearProject()
    }

    // Clear agent history
    if (agentService) {
      agentService.clearHistory()
    }

    // Notify renderer
    mainWindow?.webContents.send(IPCChannel.PROJECT_CHANGED, {
      project: null,
      previewUrl: null,
    })
  })

  // Mode handlers (placeholder - not yet implemented)
  ipcMain.handle(IPCChannel.MODE_CHANGE, async (_, payload: ModeChangePayload) => {
    console.log('Mode changed to:', payload.modeId)
    return { success: true }
  })

  ipcMain.handle(IPCChannel.MODE_LIST, async () => {
    return []
  })

  // API key handlers
  ipcMain.handle(IPCChannel.APIKEY_STATUS, async (): Promise<ApiKeyStatus> => {
    const envKey = process.env.ANTHROPIC_API_KEY
    const savedKey = getSavedApiKey()
    const activeKey = envKey || savedKey
    return {
      isSet: !!activeKey,
      maskedKey: activeKey ? maskApiKey(activeKey) : null,
    }
  })

  ipcMain.handle(IPCChannel.APIKEY_SET, async (_, payload: ApiKeySetPayload): Promise<{ success: boolean; error?: string }> => {
    const { apiKey } = payload
    if (!apiKey || !apiKey.trim()) {
      return { success: false, error: 'API key cannot be empty' }
    }

    try {
      // Validate by making a lightweight API call
      const testClient = new (await import('@anthropic-ai/sdk')).default({ apiKey: apiKey.trim() })
      await testClient.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      if (msg.includes('401') || msg.includes('auth') || msg.includes('invalid')) {
        return { success: false, error: 'Invalid API key. Please check and try again.' }
      }
      // Non-auth errors (network, rate limit) — key format is likely fine
      console.warn('API key validation warning (non-auth):', msg)
    }

    // Save and reinitialize
    saveApiKey(apiKey.trim())
    agentService = new AgentService(apiKey.trim())
    console.log('Agent service reinitialized with new API key')

    return { success: true }
  })
}

// Export for other modules
export function getMainWindow() {
  return mainWindow
}
