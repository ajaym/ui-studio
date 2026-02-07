import { app, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config as dotenvConfig } from 'dotenv'
import { IPCChannel } from '@shared/types'
import type { ChatSendPayload, ModeChangePayload } from '@shared/types'
import { AgentService } from './agent/AgentService'
import { ProjectManager } from './project/ProjectManager'
import { PreviewServer } from './preview/PreviewServer'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env file
dotenvConfig({ path: join(process.cwd(), '.env') })

let mainWindow: BrowserWindow | null = null
let agentService: AgentService | null = null
let projectManager: ProjectManager | null = null
let previewServer: PreviewServer | null = null

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
  // Clean up
  if (previewServer) {
    previewServer.stop()
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

async function initializeServices() {
  // Initialize project manager
  projectManager = new ProjectManager()

  // Initialize preview server
  previewServer = new PreviewServer()

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

        // Install dependencies
        console.log('Installing dependencies...')
        await previewServer!.installDependencies(project.path)
        console.log('Dependencies installed')

        // Start preview server
        console.log('Starting preview server...')
        const previewUrl = await previewServer!.start(project.path)
        console.log('Preview server started:', previewUrl)

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
