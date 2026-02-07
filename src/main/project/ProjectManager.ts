import { mkdirSync, writeFileSync, existsSync } from 'fs'
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

    // Create project directory structure
    mkdirSync(projectPath, { recursive: true })
    mkdirSync(join(projectPath, 'src', 'pages'), { recursive: true })
    mkdirSync(join(projectPath, 'src', 'components'), { recursive: true })
    mkdirSync(join(projectPath, 'public'), { recursive: true })

    // Create package.json
    const packageJson = {
      name: `prototype-${id}`,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        'react-router-dom': '^6.22.0',
      },
      devDependencies: {
        '@types/react': '^18.2.48',
        '@types/react-dom': '^18.2.18',
        '@vitejs/plugin-react': '^4.2.1',
        autoprefixer: '^10.4.17',
        postcss: '^8.4.33',
        tailwindcss: '^3.4.1',
        typescript: '^5.3.3',
        vite: '^5.0.12',
      },
    }

    writeFileSync(
      join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    )

    // Create vite.config.ts
    // resolve.dedupe prevents duplicate React copies (fixes invalid hook call errors)
    const viteConfig = [
      "import { defineConfig } from 'vite'",
      "import react from '@vitejs/plugin-react'",
      '',
      'export default defineConfig({',
      '  plugins: [react()],',
      '  server: {',
      '    port: 3000,',
      '  },',
      '  resolve: {',
      "    dedupe: ['react', 'react-dom'],",
      '  },',
      '})',
      '',
    ].join('\n')
    writeFileSync(join(projectPath, 'vite.config.ts'), viteConfig)

    // Create tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ['src'],
      references: [{ path: './tsconfig.node.json' }],
    }

    writeFileSync(
      join(projectPath, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    )

    // Create tsconfig.node.json
    const tsConfigNode = {
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: 'ESNext',
        moduleResolution: 'bundler',
        allowSyntheticDefaultImports: true,
      },
      include: ['vite.config.ts'],
    }

    writeFileSync(
      join(projectPath, 'tsconfig.node.json'),
      JSON.stringify(tsConfigNode, null, 2)
    )

    // Create tailwind.config.js
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`
    writeFileSync(join(projectPath, 'tailwind.config.js'), tailwindConfig)

    // Create postcss.config.js
    const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`
    writeFileSync(join(projectPath, 'postcss.config.js'), postcssConfig)

    // Create index.html
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Prototype</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
    writeFileSync(join(projectPath, 'index.html'), indexHtml)

    // Create src/main.tsx
    // NOTE: Uses array.join to prevent electron-vite's SSR build from
    // injecting CommonJS shims into these template import statements
    const mainTsx = [
      "import React from 'react'",
      "import ReactDOM from 'react-dom/client'",
      "import App from './App'",
      "import './index.css'",
      '',
      "ReactDOM.createRoot(document.getElementById('root')!).render(",
      '  <React.StrictMode>',
      '    <App />',
      '  </React.StrictMode>,',
      ')',
      '',
    ].join('\n')
    writeFileSync(join(projectPath, 'src', 'main.tsx'), mainTsx)

    // Create src/index.css
    const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`
    writeFileSync(join(projectPath, 'src', 'index.css'), indexCss)

    // Create initial App.tsx
    const appTsx = `function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Your Prototype
        </h1>
        <p className="text-gray-600">
          The AI agent will generate your interface here
        </p>
      </div>
    </div>
  )
}

export default App
`
    writeFileSync(join(projectPath, 'src', 'App.tsx'), appTsx)

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
