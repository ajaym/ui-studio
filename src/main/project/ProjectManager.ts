import { mkdirSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { PROTOTYPE_DIR } from '@shared/constants'
import type { Project } from '@shared/types'

export class ProjectManager {
  private currentProject: Project | null = null

  createProject(name: string): Project {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-')
    const id = `${slug}-${timestamp}`
    const projectPath = join(process.cwd(), PROTOTYPE_DIR, id)

    // Create project directory
    mkdirSync(projectPath, { recursive: true })

    // Create index.html with CDN dependencies
    const indexHtml = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      '    <title>Prototype</title>',
      '    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>',
      '    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>',
      '    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>',
      '    <script src="https://cdn.tailwindcss.com"></script>',
      '  </head>',
      '  <body>',
      '    <div id="root"></div>',
      '    <script type="text/babel" data-type="module" src="/app.jsx"></script>',
      '  </body>',
      '</html>',
      '',
    ].join('\n')
    writeFileSync(join(projectPath, 'index.html'), indexHtml)

    // Create placeholder app.jsx
    const appJsx = [
      'const { useState, useEffect } = React;',
      '',
      'function App() {',
      '  return (',
      '    <div className="min-h-screen bg-gray-100 flex items-center justify-center">',
      '      <div className="text-center">',
      '        <h1 className="text-4xl font-bold text-gray-900 mb-4">',
      '          Welcome to Your Prototype',
      '        </h1>',
      '        <p className="text-gray-600">',
      '          The AI agent will generate your interface here',
      '        </p>',
      '      </div>',
      '    </div>',
      '  );',
      '}',
      '',
      'ReactDOM.createRoot(document.getElementById("root")).render(<App />);',
      '',
    ].join('\n')
    writeFileSync(join(projectPath, 'app.jsx'), appJsx)

    const project: Project = {
      id,
      name,
      createdAt: Date.now(),
      path: projectPath,
    }

    this.currentProject = project
    return project
  }

  getCurrentProject(): Project | null {
    return this.currentProject
  }

  setCurrentProject(project: Project | null) {
    this.currentProject = project
  }

  getProjectPath(projectId: string): string {
    return join(process.cwd(), PROTOTYPE_DIR, projectId)
  }

  listProjects(): Project[] {
    const prototypesDir = join(process.cwd(), PROTOTYPE_DIR)
    if (!existsSync(prototypesDir)) {
      return []
    }

    const entries = readdirSync(prototypesDir, { withFileTypes: true })
    const projects: Project[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const projectPath = join(prototypesDir, entry.name)
      const hasIndex = existsSync(join(projectPath, 'index.html'))
      const hasApp = existsSync(join(projectPath, 'app.jsx'))

      if (!hasIndex || !hasApp) continue

      // Use directory creation time as createdAt
      const stats = statSync(projectPath)

      // Parse name from directory slug: strip trailing timestamp (-YYYY-MM-DD-HH-MM-SS)
      const nameSlug = entry.name.replace(/-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/, '')
      const name = nameSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

      projects.push({
        id: entry.name,
        name,
        createdAt: stats.birthtimeMs,
        path: projectPath,
      })
    }

    // Sort newest first
    projects.sort((a, b) => b.createdAt - a.createdAt)
    return projects
  }

  openProject(projectId: string): Project {
    const projectPath = this.getProjectPath(projectId)
    if (!existsSync(projectPath)) {
      throw new Error(`Project not found: ${projectId}`)
    }

    // Parse name from directory slug
    const nameSlug = projectId.replace(/-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/, '')
    const name = nameSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

    const stats = statSync(projectPath)
    const project: Project = {
      id: projectId,
      name,
      createdAt: stats.birthtimeMs,
      path: projectPath,
    }

    this.currentProject = project
    return project
  }
}
