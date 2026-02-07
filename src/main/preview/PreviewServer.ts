import { spawn, execSync, ChildProcess } from 'child_process'
import { join } from 'path'
import { PREVIEW_PORT } from '@shared/constants'

export class PreviewServer {
  private process: ChildProcess | null = null
  private port: number = PREVIEW_PORT
  private projectPath: string | null = null

  async start(projectPath: string): Promise<string> {
    // Stop existing server if running
    this.stop()

    // Kill any leftover process on the preview port from a previous session
    this.killProcessOnPort(this.port)

    this.projectPath = projectPath

    return new Promise((resolve, reject) => {
      // Start Vite dev server
      const viteProcess = spawn('npm', ['run', 'dev'], {
        cwd: projectPath,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      this.process = viteProcess

      let output = ''
      let resolved = false

      viteProcess.stdout?.on('data', (data) => {
        const text = data.toString()
        output += text
        console.log('[Preview Server]', text)

        // Check if server is ready
        if (!resolved && (text.includes('Local:') || text.includes('localhost'))) {
          resolved = true
          const url = `http://localhost:${this.port}`
          resolve(url)
        }
      })

      viteProcess.stderr?.on('data', (data) => {
        const text = data.toString()
        console.error('[Preview Server Error]', text)
      })

      viteProcess.on('error', (error) => {
        console.error('[Preview Server Error]', error)
        if (!resolved) {
          resolved = true
          reject(error)
        }
      })

      viteProcess.on('exit', (code) => {
        console.log('[Preview Server] Process exited with code', code)
        this.process = null
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          reject(new Error('Server startup timeout'))
        }
      }, 30000)
    })
  }

  stop() {
    if (this.process) {
      // Kill the entire process tree (shell + child vite process)
      const pid = this.process.pid
      if (pid) {
        try {
          process.kill(-pid, 'SIGKILL')
        } catch {
          // Fallback: kill just the process
          try { this.process.kill('SIGKILL') } catch { /* already dead */ }
        }
      }
      this.process = null
    }
  }

  private killProcessOnPort(port: number) {
    try {
      const result = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim()
      if (result) {
        const pids = result.split('\n')
        for (const pid of pids) {
          try {
            process.kill(parseInt(pid, 10), 'SIGKILL')
          } catch { /* already dead */ }
        }
        console.log(`[Preview Server] Killed leftover process(es) on port ${port}`)
      }
    } catch {
      // No process on port - this is fine
    }
  }

  isRunning(): boolean {
    return this.process !== null
  }

  getUrl(): string {
    return `http://localhost:${this.port}`
  }

  async installDependencies(projectPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const installProcess = spawn('npm', ['install'], {
        cwd: projectPath,
        shell: true,
        stdio: 'inherit',
      })

      installProcess.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`npm install failed with code ${code}`))
        }
      })

      installProcess.on('error', (error) => {
        reject(error)
      })
    })
  }
}
