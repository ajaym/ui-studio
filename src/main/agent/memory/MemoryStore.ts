import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { getAppDataDir, getPrototypePath } from '@shared/constants'
import type { Message } from '@shared/types'
import type Anthropic from '@anthropic-ai/sdk'

// --- Types ---

export interface ProjectMemory {
  projectId: string
  conversationHistory: Anthropic.MessageParam[]
  chatMessages: Message[]
  summary: string | null
  keyFacts: string[]
  lastUpdated: number
}

export interface GlobalMemoryEntry {
  id: string
  content: string
  category: 'preference' | 'pattern' | 'style' | 'constraint'
  createdAt: number
  source: string // project that generated this
}

export interface GlobalMemory {
  entries: GlobalMemoryEntry[]
  lastUpdated: number
}

// --- Constants ---

const MEMORY_DIR = 'memory'
const PROJECT_MEMORY_FILE = 'memory.json'
const GLOBAL_MEMORY_FILE = 'global-memory.json'

/**
 * Max conversation turns to persist. Beyond this, older turns are
 * trimmed and the project summary is used for context instead.
 */
const MAX_PERSISTED_TURNS = 50

// --- MemoryStore ---

export class MemoryStore {
  // ---- Project Memory ----

  private getProjectMemoryDir(projectId: string): string {
    return join(getPrototypePath(projectId), MEMORY_DIR)
  }

  private getProjectMemoryPath(projectId: string): string {
    return join(this.getProjectMemoryDir(projectId), PROJECT_MEMORY_FILE)
  }

  saveProjectMemory(
    projectId: string,
    conversationHistory: Anthropic.MessageParam[],
    chatMessages: Message[],
    summary: string | null = null,
    keyFacts: string[] = []
  ): void {
    const dir = this.getProjectMemoryDir(projectId)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    // Trim conversation history if too long — keep system-relevant tail
    const trimmedHistory =
      conversationHistory.length > MAX_PERSISTED_TURNS
        ? conversationHistory.slice(-MAX_PERSISTED_TURNS)
        : conversationHistory

    const data: ProjectMemory = {
      projectId,
      conversationHistory: trimmedHistory,
      chatMessages,
      summary,
      keyFacts,
      lastUpdated: Date.now(),
    }

    writeFileSync(this.getProjectMemoryPath(projectId), JSON.stringify(data, null, 2), 'utf-8')
  }

  loadProjectMemory(projectId: string): ProjectMemory | null {
    const path = this.getProjectMemoryPath(projectId)
    if (!existsSync(path)) return null

    try {
      const raw = readFileSync(path, 'utf-8')
      return JSON.parse(raw) as ProjectMemory
    } catch (error) {
      console.error(`Failed to load project memory for ${projectId}:`, error)
      return null
    }
  }

  updateProjectSummary(projectId: string, summary: string): void {
    const existing = this.loadProjectMemory(projectId)
    if (!existing) return

    existing.summary = summary
    existing.lastUpdated = Date.now()

    const dir = this.getProjectMemoryDir(projectId)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(this.getProjectMemoryPath(projectId), JSON.stringify(existing, null, 2), 'utf-8')
  }

  addProjectKeyFact(projectId: string, fact: string): void {
    const existing = this.loadProjectMemory(projectId)
    if (!existing) return

    if (!existing.keyFacts.includes(fact)) {
      existing.keyFacts.push(fact)
      existing.lastUpdated = Date.now()

      writeFileSync(
        this.getProjectMemoryPath(projectId),
        JSON.stringify(existing, null, 2),
        'utf-8'
      )
    }
  }

  // ---- Global Memory ----

  private getGlobalMemoryPath(): string {
    return join(getAppDataDir(), GLOBAL_MEMORY_FILE)
  }

  loadGlobalMemory(): GlobalMemory {
    const path = this.getGlobalMemoryPath()
    if (!existsSync(path)) {
      return { entries: [], lastUpdated: 0 }
    }

    try {
      const raw = readFileSync(path, 'utf-8')
      return JSON.parse(raw) as GlobalMemory
    } catch {
      return { entries: [], lastUpdated: 0 }
    }
  }

  saveGlobalMemory(memory: GlobalMemory): void {
    const dir = getAppDataDir()
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(this.getGlobalMemoryPath(), JSON.stringify(memory, null, 2), 'utf-8')
  }

  addGlobalMemoryEntry(entry: Omit<GlobalMemoryEntry, 'id' | 'createdAt'>): GlobalMemoryEntry {
    const memory = this.loadGlobalMemory()

    // Check for duplicates by content similarity
    const duplicate = memory.entries.find(
      (e) => e.content.toLowerCase() === entry.content.toLowerCase()
    )
    if (duplicate) return duplicate

    const newEntry: GlobalMemoryEntry = {
      ...entry,
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    }

    memory.entries.push(newEntry)
    memory.lastUpdated = Date.now()

    // Cap at 100 entries, remove oldest
    if (memory.entries.length > 100) {
      memory.entries = memory.entries
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 100)
    }

    this.saveGlobalMemory(memory)
    return newEntry
  }

  removeGlobalMemoryEntry(entryId: string): boolean {
    const memory = this.loadGlobalMemory()
    const before = memory.entries.length
    memory.entries = memory.entries.filter((e) => e.id !== entryId)

    if (memory.entries.length < before) {
      memory.lastUpdated = Date.now()
      this.saveGlobalMemory(memory)
      return true
    }
    return false
  }

  searchGlobalMemory(query: string): GlobalMemoryEntry[] {
    const memory = this.loadGlobalMemory()
    const lower = query.toLowerCase()
    return memory.entries.filter(
      (e) =>
        e.content.toLowerCase().includes(lower) ||
        e.category.toLowerCase().includes(lower)
    )
  }
}
