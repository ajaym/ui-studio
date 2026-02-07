import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { PROTOTYPE_DIR } from '@shared/constants'

function getPrototypePath(projectId: string, filePath: string): string {
  return join(process.cwd(), PROTOTYPE_DIR, projectId, filePath)
}

export function getTools(projectId: string): Anthropic.Tool[] {
  return [
    {
      name: 'write_file',
      description: 'Write or update a file in the current prototype project. Use this to create React components, pages, utilities, or any other code files.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path in the prototype project (e.g., "src/pages/Home.tsx", "src/components/Button.tsx")',
          },
          content: {
            type: 'string',
            description: 'Complete file content',
          },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'read_file',
      description: 'Read the contents of a file in the current prototype project. Use this to check existing code before modifying it.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to read (e.g., "src/App.tsx")',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'create_page',
      description: 'Create a new page component with routing setup. This will create the page file and update the router configuration.',
      input_schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Page name in PascalCase (e.g., "Settings", "UserProfile")',
          },
          path: {
            type: 'string',
            description: 'URL path for the page (e.g., "/settings", "/profile/:id")',
          },
          content: {
            type: 'string',
            description: 'Complete page component code',
          },
        },
        required: ['name', 'path', 'content'],
      },
    },
    {
      name: 'generate_mock_data',
      description: 'Generate realistic mock data and save it to mockData.ts. The data should be varied, believable, and appropriate for the use case.',
      input_schema: {
        type: 'object',
        properties: {
          dataType: {
            type: 'string',
            description: 'Type of data to generate (e.g., "users", "products", "tasks", "posts")',
          },
          count: {
            type: 'number',
            description: 'Number of items to generate',
          },
          schema: {
            type: 'string',
            description: 'TypeScript interface definition for the data structure',
          },
        },
        required: ['dataType', 'count', 'schema'],
      },
    },
  ]
}

export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  projectId: string
): Promise<string> {
  try {
    switch (toolName) {
      case 'write_file':
        return writeFile(projectId, toolInput.path as string, toolInput.content as string)

      case 'read_file':
        return readFile(projectId, toolInput.path as string)

      case 'create_page':
        return createPage(
          projectId,
          toolInput.name as string,
          toolInput.path as string,
          toolInput.content as string
        )

      case 'generate_mock_data':
        return generateMockData(
          projectId,
          toolInput.dataType as string,
          toolInput.count as number,
          toolInput.schema as string
        )

      default:
        return `Unknown tool: ${toolName}`
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return `Error executing ${toolName}: ${message}`
  }
}

function sanitizeBrowserCode(content: string): string {
  // Remove CommonJS shim blocks that the agent sometimes injects
  // These Node.js modules cannot run in the browser
  const lines = content.split('\n')
  const filtered = lines.filter((line) => {
    const trimmed = line.trim()
    // Remove node: imports
    if (/^import\s+.*from\s+['"]node:/.test(trimmed)) return false
    // Remove CommonJS shim comments
    if (trimmed === '// -- CommonJS Shims --') return false
    // Remove __dirname/__filename shims using node:url or node:path
    if (/^const\s+__(?:filename|dirname)\s*=\s*__cjs_/.test(trimmed)) return false
    // Remove require shims
    if (/^const\s+require\s*=\s*__cjs_/.test(trimmed)) return false
    return true
  })
  return filtered.join('\n')
}

function writeFile(projectId: string, filePath: string, content: string): string {
  const fullPath = getPrototypePath(projectId, filePath)

  // Ensure directory exists
  mkdirSync(dirname(fullPath), { recursive: true })

  // Sanitize browser code - strip Node.js imports that can't run in the browser
  const sanitized = filePath.match(/\.(?:tsx?|jsx?|mjs)$/)
    ? sanitizeBrowserCode(content)
    : content

  // Write file
  writeFileSync(fullPath, sanitized, 'utf-8')

  return `Successfully wrote ${filePath}`
}

function readFile(projectId: string, filePath: string): string {
  const fullPath = getPrototypePath(projectId, filePath)

  if (!existsSync(fullPath)) {
    return `File not found: ${filePath}`
  }

  const content = readFileSync(fullPath, 'utf-8')
  return content
}

function createPage(projectId: string, name: string, routePath: string, content: string): string {
  // Create the page file
  const pagePath = `src/pages/${name}.tsx`
  writeFile(projectId, pagePath, content)

  // Auto-update App.tsx with routing for all pages
  updateAppRouting(projectId)

  return `Created page ${name} at ${routePath}. App.tsx has been updated with routing.`
}

function updateAppRouting(projectId: string): void {
  const pagesDir = getPrototypePath(projectId, 'src/pages')
  if (!existsSync(pagesDir)) return

  const pageFiles = readdirSync(pagesDir).filter((f) => f.endsWith('.tsx'))
  if (pageFiles.length === 0) return

  const pages = pageFiles.map((f) => {
    const name = f.replace('.tsx', '')
    const route = name === 'Home' ? '/' : `/${name.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '')}`
    return { name, route }
  })

  // Build App.tsx with routing using array join to avoid electron-vite transform
  const lines: string[] = []

  // Imports
  lines.push("import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'")
  for (const page of pages) {
    lines.push(`import ${page.name} from './pages/${page.name}'`)
  }
  lines.push('')

  // Component
  lines.push('function App() {')
  lines.push('  return (')
  lines.push('    <BrowserRouter>')

  // Add nav if multiple pages
  if (pages.length > 1) {
    lines.push('      <nav className="bg-white shadow-sm border-b px-4 py-3">')
    lines.push('        <div className="flex gap-4">')
    for (const page of pages) {
      lines.push(`          <Link to="${page.route}" className="text-sm font-medium text-gray-600 hover:text-gray-900">${page.name}</Link>`)
    }
    lines.push('        </div>')
    lines.push('      </nav>')
  }

  lines.push('      <Routes>')
  for (const page of pages) {
    lines.push(`        <Route path="${page.route}" element={<${page.name} />} />`)
  }
  lines.push('      </Routes>')
  lines.push('    </BrowserRouter>')
  lines.push('  )')
  lines.push('}')
  lines.push('')
  lines.push('export default App')
  lines.push('')

  const appContent = lines.join('\n')
  writeFile(projectId, 'src/App.tsx', appContent)
}

function generateMockData(
  projectId: string,
  dataType: string,
  count: number,
  schema: string
): string {
  // This is a placeholder - the agent will generate the actual data
  const mockDataTemplate = `// Mock data for ${dataType}
${schema}

export const ${dataType}: ${dataType.charAt(0).toUpperCase() + dataType.slice(1)}[] = [
  // Data will be generated by the agent
]
`

  writeFile(projectId, 'src/mockData.ts', mockDataTemplate)

  return `Created mock data template for ${dataType}`
}
