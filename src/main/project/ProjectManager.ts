import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { nanoid } from 'nanoid'
import { PROTOTYPE_DIR } from '@shared/constants'

export interface Project {
  id: string
  name: string
  createdAt: number
  path: string
}

export class ProjectManager {
  private currentProject: Project | null = null

  createProject(name: string): Project {
    const id = nanoid()
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

  getProjectPath(projectId: string): string {
    return join(process.cwd(), PROTOTYPE_DIR, projectId)
  }
}
