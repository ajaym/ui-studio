import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
}))

import { ProjectManager } from './ProjectManager'

describe('ProjectManager', () => {
  let manager: ProjectManager
  const prototypesDir = join(process.cwd(), 'prototypes')
  // Use a prefix that slugifies cleanly (no special chars)
  const testTag = 'zztestpm'

  beforeEach(() => {
    manager = new ProjectManager()
    mkdirSync(prototypesDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up test projects
    try {
      const entries = readdirSync(prototypesDir)
      for (const entry of entries) {
        if (entry.startsWith(testTag)) {
          rmSync(join(prototypesDir, entry), { recursive: true, force: true })
        }
      }
    } catch {
      // ignore
    }
  })

  describe('createProject', () => {
    it('should create a project directory with correct structure', () => {
      const project = manager.createProject(testTag + ' My App')

      // Slug: "zztestpm-my-app" + timestamp
      expect(project.id).toMatch(/^zztestpm-my-app-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/)
      expect(project.name).toBe(testTag + ' My App')
      expect(project.path).toBeDefined()
      expect(project.createdAt).toBeGreaterThan(0)

      // Check files were created
      expect(existsSync(join(project.path, 'index.html'))).toBe(true)
      expect(existsSync(join(project.path, 'app.jsx'))).toBe(true)
    })

    it('should generate correct index.html with CDN dependencies', () => {
      const project = manager.createProject(testTag + ' CDN Test')
      const html = readFileSync(join(project.path, 'index.html'), 'utf-8')

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('react@18/umd/react.development.js')
      expect(html).toContain('react-dom@18/umd/react-dom.development.js')
      expect(html).toContain('@babel/standalone/babel.min.js')
      expect(html).toContain('cdn.tailwindcss.com')
      expect(html).toContain('<div id="root"></div>')
      expect(html).toContain('text/babel')
      expect(html).toContain('src="/app.jsx"')
    })

    it('should generate placeholder app.jsx', () => {
      const project = manager.createProject(testTag + ' JSX Test')
      const jsx = readFileSync(join(project.path, 'app.jsx'), 'utf-8')

      expect(jsx).toContain('const { useState, useEffect } = React')
      expect(jsx).toContain('function App()')
      expect(jsx).toContain('Welcome to Your Prototype')
      expect(jsx).toContain('ReactDOM.createRoot')
    })

    it('should slugify the project name', () => {
      const project = manager.createProject(testTag + ' My COOL App!!')
      expect(project.id).toMatch(/^zztestpm-my-cool-app-/)
    })

    it('should truncate long slugs to 40 characters', () => {
      const longName = testTag + ' ' + 'A'.repeat(100)
      const project = manager.createProject(longName)
      const slug = project.id.replace(/-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/, '')
      expect(slug.length).toBeLessThanOrEqual(40)
    })

    it('should set current project after creation', () => {
      const project = manager.createProject(testTag + ' Current Test')
      expect(manager.getCurrentProject()).toEqual(project)
    })
  })

  describe('getCurrentProject / setCurrentProject', () => {
    it('should return null initially', () => {
      expect(manager.getCurrentProject()).toBeNull()
    })

    it('should set and get current project', () => {
      const project = {
        id: 'test-id',
        name: 'Test',
        createdAt: Date.now(),
        path: '/test/path',
      }
      manager.setCurrentProject(project)
      expect(manager.getCurrentProject()).toEqual(project)
    })

    it('should allow setting to null', () => {
      const project = manager.createProject(testTag + ' Null Test')
      expect(manager.getCurrentProject()).toBeTruthy()

      manager.setCurrentProject(null)
      expect(manager.getCurrentProject()).toBeNull()
    })
  })

  describe('getProjectPath', () => {
    it('should return correct path for project ID', () => {
      const path = manager.getProjectPath('my-project-123')
      expect(path).toBe(join(prototypesDir, 'my-project-123'))
    })
  })

  describe('listProjects', () => {
    it('should return empty array when prototypes dir is empty', () => {
      // Create a dir with no index.html or app.jsx - won't be listed
      const tempDir = join(prototypesDir, testTag + '-empty-dir')
      mkdirSync(tempDir, { recursive: true })

      const projects = manager.listProjects()
      const found = projects.find((p) => p.id === testTag + '-empty-dir')
      expect(found).toBeUndefined()

      rmSync(tempDir, { recursive: true, force: true })
    })

    it('should list valid projects', () => {
      // Create two valid projects
      const p1 = manager.createProject(testTag + ' Project A')
      const p2 = manager.createProject(testTag + ' Project B')

      const allProjects = manager.listProjects()
      const testProjects = allProjects.filter((p) => p.id.startsWith(testTag))

      expect(testProjects.length).toBeGreaterThanOrEqual(2)
      expect(testProjects.every((p) => p.id && p.name && p.path && typeof p.createdAt === 'number')).toBe(true)
    })

    it('should sort projects newest first', () => {
      manager.createProject(testTag + ' Old Project')
      manager.createProject(testTag + ' New Project')

      const allProjects = manager.listProjects()
      const testProjects = allProjects.filter((p) => p.id.startsWith(testTag))

      if (testProjects.length >= 2) {
        expect(testProjects[0].createdAt).toBeGreaterThanOrEqual(testProjects[1].createdAt)
      }
    })

    it('should skip directories without index.html or app.jsx', () => {
      const dirName = testTag + '-incomplete-2025-01-01-00-00-00'
      const incompleteDir = join(prototypesDir, dirName)
      mkdirSync(incompleteDir, { recursive: true })
      writeFileSync(join(incompleteDir, 'index.html'), '<html></html>')
      // No app.jsx - should be skipped

      const allProjects = manager.listProjects()
      const found = allProjects.find((p) => p.id === dirName)
      expect(found).toBeUndefined()

      rmSync(incompleteDir, { recursive: true, force: true })
    })

    it('should parse project name from slug', () => {
      const dirName = testTag + '-my-cool-app-2025-01-15-10-30-00'
      const dir = join(prototypesDir, dirName)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'index.html'), '<html></html>')
      writeFileSync(join(dir, 'app.jsx'), 'function App() {}')

      const allProjects = manager.listProjects()
      const found = allProjects.find((p) => p.id === dirName)

      expect(found).toBeDefined()
      // Name should be title-cased from the slug (timestamp stripped)
      // "zztestpm-my-cool-app" -> "Zztestpm My Cool App"
      expect(found!.name).toContain('Cool')
      expect(found!.name).toContain('App')

      rmSync(dir, { recursive: true, force: true })
    })
  })

  describe('openProject', () => {
    it('should open an existing project', () => {
      const created = manager.createProject(testTag + ' Open Test')
      manager.setCurrentProject(null)

      const opened = manager.openProject(created.id)
      expect(opened.id).toBe(created.id)
      expect(opened.path).toBe(created.path)
      expect(manager.getCurrentProject()).toEqual(opened)
    })

    it('should throw for non-existent project', () => {
      expect(() => manager.openProject('nonexistent-project-id')).toThrow('Project not found')
    })

    it('should parse name from project ID', () => {
      const created = manager.createProject(testTag + ' Name Parse')
      manager.setCurrentProject(null)

      const opened = manager.openProject(created.id)
      // The name should be derived from the slug portion
      expect(opened.name).toBeTruthy()
    })
  })
})
