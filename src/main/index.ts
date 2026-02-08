import { app, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config as dotenvConfig } from 'dotenv'
import { IPCChannel } from '@shared/types'
import type { ChatSendPayload, ModeChangePayload } from '@shared/types'
import { AgentService } from './agent/AgentService'
import { ProjectManager } from './project/ProjectManager'
import { StaticServer } from './preview/StaticServer'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env file
dotenvConfig({ path: join(process.cwd(), '.env') })

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

  // Initialize agent service
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable not set')
    console.log('Please set your API key: export ANTHROPIC_API_KEY=your_key_here')
    // Continue anyway for UI testing
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
        project = projectManager.createProject('New Prototype')
        console.log('Created new project:', project.id)

        // Start static server (synchronous, no npm install needed)
        const previewUrl = staticServer!.start(project.path)
        console.log('Static server started:', previewUrl)

        // Send preview URL to renderer
        mainWindow?.webContents.send(IPCChannel.PREVIEW_URL, previewUrl)

        // Initialize agent for this project
        await agentService.initialize('rapid-prototype', project.id)
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

  // Mode handlers (placeholder - not yet implemented)
  ipcMain.handle(IPCChannel.MODE_CHANGE, async (_, payload: ModeChangePayload) => {
    console.log('Mode changed to:', payload.modeId)
    return { success: true }
  })

  ipcMain.handle(IPCChannel.MODE_LIST, async () => {
    return []
  })
}

// Export for other modules
export function getMainWindow() {
  return mainWindow
}
