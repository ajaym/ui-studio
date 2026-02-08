import { app } from 'electron'
import { join } from 'path'

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
