import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { PROTOTYPE_DIR } from '@shared/constants'

function getPrototypePath(projectId: string, filePath: string): string {
  return join(process.cwd(), PROTOTYPE_DIR, projectId, filePath)
}

export function getTools(): Anthropic.Tool[] {
  return [
    {
      name: 'write_file',
      description:
        'Write or update a file in the current prototype project. Primarily used to write app.jsx with all components and rendering logic.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Relative path in the prototype project (e.g., "app.jsx")',
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
      description:
        'Read the contents of a file in the current prototype project. Use this to check existing code before modifying it.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to read (e.g., "app.jsx")',
          },
        },
        required: ['path'],
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
        return writeFile(
          projectId,
          toolInput.path as string,
          toolInput.content as string
        )

      case 'read_file':
        return readFile(projectId, toolInput.path as string)

      default:
        return `Unknown tool: ${toolName}`
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return `Error executing ${toolName}: ${message}`
  }
}

function sanitizeForCDN(content: string): string {
  const lines = content.split('\n')
  const filtered = lines.filter((line) => {
    const trimmed = line.trim()
    // Strip import React / ReactDOM / react-router-dom lines
    if (/^import\s+.*from\s+['"]react['"]/.test(trimmed)) return false
    if (/^import\s+.*from\s+['"]react-dom/.test(trimmed)) return false
    if (/^import\s+.*from\s+['"]react-router/.test(trimmed)) return false
    // Strip node: imports
    if (/^import\s+.*from\s+['"]node:/.test(trimmed)) return false
    // Strip export default lines (not needed in CDN context)
    if (/^export\s+default\s+/.test(trimmed)) return false
    return true
  })
  return filtered.join('\n')
}

function writeFile(
  projectId: string,
  filePath: string,
  content: string
): string {
  const fullPath = getPrototypePath(projectId, filePath)

  // Ensure directory exists
  mkdirSync(dirname(fullPath), { recursive: true })

  // Sanitize JSX/JS files for CDN usage
  const sanitized = filePath.match(/\.(?:jsx?|mjs)$/)
    ? sanitizeForCDN(content)
    : content

  writeFileSync(fullPath, sanitized, 'utf-8')

  return `Successfully wrote ${filePath}`
}

function readFile(projectId: string, filePath: string): string {
  const fullPath = getPrototypePath(projectId, filePath)

  if (!existsSync(fullPath)) {
    return `File not found: ${filePath}`
  }

  return readFileSync(fullPath, 'utf-8')
}
