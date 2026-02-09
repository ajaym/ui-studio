import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

export const PREVIEW_PORT = 3000

export const DEFAULT_AGENT_CONFIG = {
  model: 'claude-sonnet-4-5-20250929',
  temperature: 0.7,
  maxTokens: 8192,
}

export const PROTOTYPE_DIR = 'prototypes'

/**
 * In a packaged Electron app, process.cwd() is unreliable (e.g. "/" on macOS).
 * Use app.getPath('userData') for persistent user-writable storage.
 * In development, fall back to process.cwd() for convenience.
 */
export function getAppDataDir(): string {
  if (app.isPackaged) {
    return app.getPath('userData')
  }
  return process.cwd()
}

export function getPrototypesDir(): string {
  return join(getAppDataDir(), PROTOTYPE_DIR)
}

export function getPrototypePath(projectId: string, filePath?: string): string {
  const base = join(getPrototypesDir(), projectId)
  return filePath ? join(base, filePath) : base
}

// --- Config file for persisted settings (e.g. API key) ---

const CONFIG_FILENAME = 'config.json'

interface AppConfig {
  anthropicApiKey?: string
}

function getConfigPath(): string {
  return join(getAppDataDir(), CONFIG_FILENAME)
}

function readConfig(): AppConfig {
  const configPath = getConfigPath()
  if (!existsSync(configPath)) return {}
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'))
  } catch {
    return {}
  }
}

function writeConfig(config: AppConfig): void {
  const dir = getAppDataDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8')
}

export function getSavedApiKey(): string | undefined {
  return readConfig().anthropicApiKey
}

export function saveApiKey(apiKey: string): void {
  const config = readConfig()
  config.anthropicApiKey = apiKey
  writeConfig(config)
}

export function clearSavedApiKey(): void {
  const config = readConfig()
  delete config.anthropicApiKey
  writeConfig(config)
}

export function maskApiKey(key: string): string {
  if (key.length <= 12) return '****'
  return key.slice(0, 7) + '...' + key.slice(-4)
}
