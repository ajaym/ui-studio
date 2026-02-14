import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
}))

import { getTools, executeToolCall } from './index'

describe('Agent Tools', () => {
  describe('getTools', () => {
    it('should return an array of tool definitions', () => {
      const tools = getTools()
      expect(Array.isArray(tools)).toBe(true)
      expect(tools.length).toBe(2)
    })

    it('should include write_file tool', () => {
      const tools = getTools()
      const writeTool = tools.find((t) => t.name === 'write_file')
      expect(writeTool).toBeDefined()
      expect(writeTool!.description).toContain('Write or update a file')
      expect(writeTool!.input_schema.properties).toHaveProperty('path')
      expect(writeTool!.input_schema.properties).toHaveProperty('content')
      expect(writeTool!.input_schema.required).toEqual(['path', 'content'])
    })

    it('should include read_file tool', () => {
      const tools = getTools()
      const readTool = tools.find((t) => t.name === 'read_file')
      expect(readTool).toBeDefined()
      expect(readTool!.description).toContain('Read the contents')
      expect(readTool!.input_schema.properties).toHaveProperty('path')
      expect(readTool!.input_schema.required).toEqual(['path'])
    })
  })

  describe('executeToolCall', () => {
    const testProjectId = '__test-tools-project__'
    const testProjectDir = join(process.cwd(), 'prototypes', testProjectId)

    beforeEach(() => {
      mkdirSync(testProjectDir, { recursive: true })
    })

    afterEach(() => {
      try {
        rmSync(testProjectDir, { recursive: true, force: true })
      } catch {
        // ignore
      }
    })

    it('should write a file successfully', async () => {
      const result = await executeToolCall(
        'write_file',
        { path: 'test.txt', content: 'hello world' },
        testProjectId
      )
      expect(result).toBe('Successfully wrote test.txt')

      const written = readFileSync(join(testProjectDir, 'test.txt'), 'utf-8')
      expect(written).toBe('hello world')
    })

    it('should sanitize JSX files by removing React imports', async () => {
      const content = [
        'import React from "react"',
        'import ReactDOM from "react-dom"',
        'import { BrowserRouter } from "react-router-dom"',
        'const App = () => <div>Hello</div>',
        'ReactDOM.render(<App />, document.getElementById("root"))',
      ].join('\n')

      await executeToolCall(
        'write_file',
        { path: 'app.jsx', content },
        testProjectId
      )

      const written = readFileSync(join(testProjectDir, 'app.jsx'), 'utf-8')
      expect(written).not.toContain('import React from "react"')
      expect(written).not.toContain('import ReactDOM from "react-dom"')
      expect(written).not.toContain('import { BrowserRouter }')
      expect(written).toContain('const App = () => <div>Hello</div>')
      expect(written).toContain('ReactDOM.render')
    })

    it('should strip export default statements from JSX', async () => {
      const content = [
        'function App() { return <div /> }',
        'export default App',
      ].join('\n')

      await executeToolCall(
        'write_file',
        { path: 'app.jsx', content },
        testProjectId
      )

      const written = readFileSync(join(testProjectDir, 'app.jsx'), 'utf-8')
      expect(written).not.toContain('export default')
      expect(written).toContain('function App()')
    })

    it('should strip node: imports from JS files', async () => {
      const content = [
        'import fs from "node:fs"',
        'console.log("hello")',
      ].join('\n')

      await executeToolCall(
        'write_file',
        { path: 'app.js', content },
        testProjectId
      )

      const written = readFileSync(join(testProjectDir, 'app.js'), 'utf-8')
      expect(written).not.toContain('import fs from "node:fs"')
      expect(written).toContain('console.log("hello")')
    })

    it('should NOT sanitize non-JS/JSX files', async () => {
      const content = 'import React from "react"\n<html></html>'

      await executeToolCall(
        'write_file',
        { path: 'index.html', content },
        testProjectId
      )

      const written = readFileSync(join(testProjectDir, 'index.html'), 'utf-8')
      expect(written).toContain('import React from "react"')
    })

    it('should read a file successfully', async () => {
      writeFileSync(join(testProjectDir, 'read-me.txt'), 'file content here')

      const result = await executeToolCall(
        'read_file',
        { path: 'read-me.txt' },
        testProjectId
      )
      expect(result).toBe('file content here')
    })

    it('should return "File not found" for non-existent files', async () => {
      const result = await executeToolCall(
        'read_file',
        { path: 'nonexistent.txt' },
        testProjectId
      )
      expect(result).toBe('File not found: nonexistent.txt')
    })

    it('should return error for unknown tool', async () => {
      const result = await executeToolCall(
        'unknown_tool',
        {},
        testProjectId
      )
      expect(result).toBe('Unknown tool: unknown_tool')
    })

    it('should create nested directories when writing', async () => {
      await executeToolCall(
        'write_file',
        { path: 'sub/dir/file.txt', content: 'nested' },
        testProjectId
      )

      const written = readFileSync(join(testProjectDir, 'sub/dir/file.txt'), 'utf-8')
      expect(written).toBe('nested')
    })

    it('should sanitize .mjs files', async () => {
      const content = [
        'import React from "react"',
        'console.log("mjs file")',
      ].join('\n')

      await executeToolCall(
        'write_file',
        { path: 'utils.mjs', content },
        testProjectId
      )

      const written = readFileSync(join(testProjectDir, 'utils.mjs'), 'utf-8')
      expect(written).not.toContain('import React from "react"')
    })
  })
})
