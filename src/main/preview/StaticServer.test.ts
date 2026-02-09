import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import http from 'http'

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
}))

// Mock execSync to avoid actually killing processes
vi.mock('child_process', () => ({
  execSync: vi.fn().mockImplementation(() => {
    throw new Error('No process on port')
  }),
}))

import { StaticServer } from './StaticServer'

function httpGet(url: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () =>
        resolve({ status: res.statusCode || 0, headers: res.headers, body: data })
      )
    }).on('error', reject)
  })
}

describe('StaticServer', () => {
  const testDir = join(process.cwd(), '__test-static-server__')

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true })
    writeFileSync(join(testDir, 'index.html'), '<html><body>Test</body></html>')
    writeFileSync(join(testDir, 'app.jsx'), 'function App() { return <div /> }')
    writeFileSync(join(testDir, 'style.css'), 'body { color: red; }')
    writeFileSync(join(testDir, 'data.json'), '{"key": "value"}')
  })

  afterAll(() => {
    try {
      rmSync(testDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  describe('basic operations (no HTTP)', () => {
    it('should return false for isRunning initially', () => {
      const server = new StaticServer()
      expect(server.isRunning()).toBe(false)
    })

    it('should return correct URL from getUrl', () => {
      const server = new StaticServer()
      expect(server.getUrl()).toBe('http://localhost:3000')
    })

    it('should handle stop when not running', () => {
      const server = new StaticServer()
      server.stop()
      expect(server.isRunning()).toBe(false)
    })
  })

  describe('server lifecycle and HTTP serving', () => {
    let server: StaticServer

    beforeAll(() => {
      server = new StaticServer()
    })

    afterAll(() => {
      server.stop()
    })

    it('should start and return URL', () => {
      const url = server.start(testDir)
      expect(url).toBe('http://localhost:3000')
      expect(server.isRunning()).toBe(true)
    })

    it('should switch project path when already running', () => {
      const url = server.start(testDir)
      expect(url).toBe('http://localhost:3000')
      expect(server.isRunning()).toBe(true)
    })

    it('should serve index.html for root path', async () => {
      await new Promise((r) => setTimeout(r, 100))
      const res = await httpGet('http://localhost:3000/')
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toBe('text/html')
      expect(res.body).toContain('<html>')
    })

    it('should serve JSX files with correct MIME type', async () => {
      const res = await httpGet('http://localhost:3000/app.jsx')
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toBe('application/javascript')
    })

    it('should serve CSS files with correct MIME type', async () => {
      const res = await httpGet('http://localhost:3000/style.css')
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toBe('text/css')
    })

    it('should serve JSON files with correct MIME type', async () => {
      const res = await httpGet('http://localhost:3000/data.json')
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toBe('application/json')
    })

    it('should fall back to index.html for missing paths (SPA)', async () => {
      const res = await httpGet('http://localhost:3000/nonexistent')
      expect(res.status).toBe(200)
      expect(res.body).toContain('<html>')
    })

    it('should include no-cache header', async () => {
      const res = await httpGet('http://localhost:3000/app.jsx')
      expect(res.headers['cache-control']).toBe('no-cache')
    })

    it('should strip query strings from URLs', async () => {
      const res = await httpGet('http://localhost:3000/app.jsx?v=123')
      expect(res.status).toBe(200)
      expect(res.body).toContain('function App()')
    })

    it('should return 500 when project path is cleared', async () => {
      server.clearProject()
      const res = await httpGet('http://localhost:3000/')
      expect(res.status).toBe(500)
      expect(res.body).toContain('No project path set')
    })

    it('should stop the server', () => {
      server.stop()
      expect(server.isRunning()).toBe(false)
    })
  })
})
