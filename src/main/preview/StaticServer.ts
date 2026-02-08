import { createServer, IncomingMessage, ServerResponse } from 'http'
import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { PREVIEW_PORT } from '@shared/constants'
import type { Server } from 'http'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.jsx': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
}

export class StaticServer {
  private server: Server | null = null
  private projectPath: string | null = null

  start(projectPath: string): string {
    // If server is already running, just switch the project path —
    // the request handler reads this.projectPath dynamically
    if (this.server) {
      this.projectPath = projectPath
      const url = `http://localhost:${PREVIEW_PORT}`
      console.log(`[Static Server] Serving ${projectPath} at ${url}`)
      return url
    }

    this.killProcessOnPort(PREVIEW_PORT)
    this.projectPath = projectPath

    this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (!this.projectPath) {
        res.writeHead(500)
        res.end('No project path set')
        return
      }

      // Default to index.html for root
      let filePath = req.url === '/' ? '/index.html' : req.url || '/index.html'

      // Strip query string
      filePath = filePath.split('?')[0]

      const fullPath = join(this.projectPath, filePath)

      if (!existsSync(fullPath)) {
        // Fall back to index.html for SPA-style routing
        const indexPath = join(this.projectPath, 'index.html')
        if (existsSync(indexPath)) {
          const content = readFileSync(indexPath)
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(content)
          return
        }
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const ext = extname(fullPath)
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'

      const content = readFileSync(fullPath)
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      })
      res.end(content)
    })

    this.server.listen(PREVIEW_PORT)
    const url = `http://localhost:${PREVIEW_PORT}`
    console.log(`[Static Server] Serving ${projectPath} at ${url}`)
    return url
  }

  clearProject() {
    this.projectPath = null
  }

  stop() {
    if (this.server) {
      this.server.close()
      this.server = null
      console.log('[Static Server] Stopped')
    }
  }

  isRunning(): boolean {
    return this.server !== null
  }

  getUrl(): string {
    return `http://localhost:${PREVIEW_PORT}`
  }

  private killProcessOnPort(port: number) {
    const myPid = process.pid
    try {
      let result: string
      if (process.platform === 'win32') {
        // Windows: use netstat to find PIDs on the port
        const raw = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
          encoding: 'utf-8',
        }).trim()
        // Each line ends with the PID
        const pids = raw
          .split('\n')
          .map((line) => parseInt(line.trim().split(/\s+/).pop() || '', 10))
          .filter((pid) => !isNaN(pid))
        result = pids.join('\n')
      } else {
        result = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim()
      }
      if (result) {
        const pids = result.split('\n')
        for (const pid of pids) {
          const numPid = parseInt(pid, 10)
          if (isNaN(numPid) || numPid === myPid) continue
          try {
            process.kill(numPid, 'SIGKILL')
          } catch { /* already dead */ }
        }
        console.log(`[Static Server] Killed stale process(es) on port ${port}`)
      }
    } catch {
      // No process on port — this is fine
    }
  }
}
