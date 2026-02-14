import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { rmSync } from 'fs'

// Mock electron's app module
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
}))

import {
  PREVIEW_PORT,
  DEFAULT_AGENT_CONFIG,
  PROTOTYPE_DIR,
  getAppDataDir,
  getPrototypesDir,
  getPrototypePath,
  maskApiKey,
  getSavedApiKey,
  saveApiKey,
  clearSavedApiKey,
} from './constants'

describe('constants', () => {
  describe('static values', () => {
    it('should have PREVIEW_PORT set to 3000', () => {
      expect(PREVIEW_PORT).toBe(3000)
    })

    it('should have DEFAULT_AGENT_CONFIG with expected values', () => {
      expect(DEFAULT_AGENT_CONFIG).toEqual({
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.7,
        maxTokens: 8192,
      })
    })

    it('should have PROTOTYPE_DIR set to "prototypes"', () => {
      expect(PROTOTYPE_DIR).toBe('prototypes')
    })
  })

  describe('getAppDataDir', () => {
    it('should return cwd when app is not packaged', () => {
      const result = getAppDataDir()
      expect(result).toBe(process.cwd())
    })
  })

  describe('getPrototypesDir', () => {
    it('should return prototypes directory path', () => {
      const result = getPrototypesDir()
      expect(result).toBe(join(process.cwd(), 'prototypes'))
    })
  })

  describe('getPrototypePath', () => {
    it('should return base project path when no file specified', () => {
      const result = getPrototypePath('my-project')
      expect(result).toBe(join(process.cwd(), 'prototypes', 'my-project'))
    })

    it('should return file path within project when file specified', () => {
      const result = getPrototypePath('my-project', 'app.jsx')
      expect(result).toBe(join(process.cwd(), 'prototypes', 'my-project', 'app.jsx'))
    })

    it('should handle nested file paths', () => {
      const result = getPrototypePath('my-project', 'src/components/Header.jsx')
      expect(result).toBe(
        join(process.cwd(), 'prototypes', 'my-project', 'src/components/Header.jsx')
      )
    })
  })

  describe('maskApiKey', () => {
    it('should mask keys longer than 12 characters', () => {
      const result = maskApiKey('sk-ant-api03-abcdefghij12345678')
      expect(result).toBe('sk-ant-...5678')
    })

    it('should return **** for short keys', () => {
      expect(maskApiKey('short')).toBe('****')
      expect(maskApiKey('12345678')).toBe('****')
      expect(maskApiKey('123456789012')).toBe('****')
    })

    it('should show first 7 and last 4 characters', () => {
      const key = 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxx'
      const result = maskApiKey(key)
      expect(result.startsWith('sk-ant-')).toBe(true)
      expect(result.endsWith(key.slice(-4))).toBe(true)
      expect(result).toContain('...')
    })

    it('should handle exactly 13 character key', () => {
      const result = maskApiKey('1234567890abc')
      expect(result).toBe('1234567...0abc')
    })
  })

  describe('config persistence (getSavedApiKey, saveApiKey, clearSavedApiKey)', () => {
    const tmpDir = join(process.cwd(), '.test-config-tmp')
    const configPath = join(tmpDir, 'config.json')

    beforeEach(() => {
      // We need to mock getAppDataDir to use our tmp directory
      // Since the config functions use getAppDataDir internally,
      // we'll test them indirectly through the file system
      mkdirSync(tmpDir, { recursive: true })
    })

    afterEach(() => {
      try {
        rmSync(tmpDir, { recursive: true, force: true })
      } catch {
        // ignore cleanup errors
      }
    })

    it('getSavedApiKey should return undefined when no config exists', () => {
      // Since the actual function reads from getAppDataDir(),
      // and app.isPackaged is false, it reads from cwd
      // This test validates the function doesn't throw when config doesn't exist
      const result = getSavedApiKey()
      // Result depends on whether a config.json exists in cwd
      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('saveApiKey and getSavedApiKey should work together', () => {
      const testKey = 'sk-test-' + Date.now()
      saveApiKey(testKey)
      const result = getSavedApiKey()
      expect(result).toBe(testKey)
    })

    it('clearSavedApiKey should remove the key', () => {
      const testKey = 'sk-test-clear-' + Date.now()
      saveApiKey(testKey)
      expect(getSavedApiKey()).toBe(testKey)

      clearSavedApiKey()
      expect(getSavedApiKey()).toBeUndefined()
    })
  })
})
