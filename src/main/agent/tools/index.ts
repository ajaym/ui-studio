import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { dirname } from 'path'
import { getPrototypePath } from '@shared/constants'
import type { MemoryStore } from '../memory/MemoryStore'

let memoryStoreRef: MemoryStore | null = null

export function setMemoryStore(store: MemoryStore): void {
  memoryStoreRef = store
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
    {
      name: 'save_memory',
      description:
        'Save an important fact or user preference to persistent memory. Use this when the user expresses a preference, style choice, design pattern, or constraint that should be remembered across sessions. Examples: "User prefers dark themes", "Always use Inter font", "Components should have rounded corners".',
      input_schema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The fact or preference to remember',
          },
          category: {
            type: 'string',
            enum: ['preference', 'pattern', 'style', 'constraint'],
            description:
              'Category: preference (user likes/dislikes), pattern (code patterns to follow), style (visual/design style), constraint (technical limitations)',
          },
        },
        required: ['content', 'category'],
      },
    },
    {
      name: 'recall_memory',
      description:
        'Search saved memories for relevant information. Use this at the start of a new session or when you need to recall user preferences and past decisions.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search query to find relevant memories (e.g., "color", "font", "layout")',
          },
        },
        required: ['query'],
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

      case 'save_memory':
        return saveMemory(
          projectId,
          toolInput.content as string,
          toolInput.category as 'preference' | 'pattern' | 'style' | 'constraint'
        )

      case 'recall_memory':
        return recallMemory(toolInput.query as string)

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

function saveMemory(
  projectId: string,
  content: string,
  category: 'preference' | 'pattern' | 'style' | 'constraint'
): string {
  if (!memoryStoreRef) {
    return 'Memory system not available'
  }

  const entry = memoryStoreRef.addGlobalMemoryEntry({
    content,
    category,
    source: projectId,
  })

  return `Saved to memory (${entry.category}): "${entry.content}"`
}

function recallMemory(query: string): string {
  if (!memoryStoreRef) {
    return 'Memory system not available'
  }

  const results = memoryStoreRef.searchGlobalMemory(query)
  if (results.length === 0) {
    return `No memories found matching "${query}"`
  }

  const formatted = results
    .map((e) => `- [${e.category}] ${e.content}`)
    .join('\n')

  return `Found ${results.length} memories:\n${formatted}`
}
