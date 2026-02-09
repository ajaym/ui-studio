import { describe, it, expect } from 'vitest'
import { getSystemPrompt } from './prompts'

describe('prompts', () => {
  describe('getSystemPrompt', () => {
    it('should include base prompt content', () => {
      const prompt = getSystemPrompt('rapid-prototype', 'test-project-123')

      expect(prompt).toContain('expert UI/UX prototyping assistant')
      expect(prompt).toContain('Runtime Environment')
      expect(prompt).toContain('CRITICAL RULES')
      expect(prompt).toContain('NO imports')
      expect(prompt).toContain('NO TypeScript')
      expect(prompt).toContain('NO external packages')
      expect(prompt).toContain('NO export statements')
    })

    it('should include project ID', () => {
      const prompt = getSystemPrompt('rapid-prototype', 'my-project-2025')
      expect(prompt).toContain('my-project-2025')
    })

    it('should include mode in prompt', () => {
      const prompt = getSystemPrompt('rapid-prototype', 'test')
      expect(prompt).toContain('Mode: rapid-prototype')
    })

    it('should include routing instructions', () => {
      const prompt = getSystemPrompt('rapid-prototype', 'test')
      expect(prompt).toContain('useHashRoute')
      expect(prompt).toContain('hashchange')
      expect(prompt).toContain('Link')
    })

    it('should include tool descriptions', () => {
      const prompt = getSystemPrompt('rapid-prototype', 'test')
      expect(prompt).toContain('write_file')
      expect(prompt).toContain('read_file')
    })

    it('should include response style instructions', () => {
      const prompt = getSystemPrompt('rapid-prototype', 'test')
      expect(prompt).toContain('Response Style')
      expect(prompt).toContain('Briefly explain')
      expect(prompt).toContain('Suggest next steps')
    })

    describe('mode-specific prompts', () => {
      it('should include rapid-prototype mode instructions', () => {
        const prompt = getSystemPrompt('rapid-prototype', 'test')
        expect(prompt).toContain('Rapid Prototype Mode')
        expect(prompt).toContain('Prioritize speed')
        expect(prompt).toContain('Desktop-first')
      })

      it('should include mobile-first mode instructions', () => {
        const prompt = getSystemPrompt('mobile-first', 'test')
        expect(prompt).toContain('Mobile-First Mode')
        expect(prompt).toContain('mobile screens first')
        expect(prompt).toContain('Touch-friendly')
      })

      it('should include data-heavy mode instructions', () => {
        const prompt = getSystemPrompt('data-heavy', 'test')
        expect(prompt).toContain('Data-Heavy Mode')
        expect(prompt).toContain('Extensive mock data')
        expect(prompt).toContain('Tables, charts')
      })

      it('should include presentation mode instructions', () => {
        const prompt = getSystemPrompt('presentation', 'test')
        expect(prompt).toContain('Presentation Mode')
        expect(prompt).toContain('High visual polish')
        expect(prompt).toContain('Smooth animations')
      })

      it('should handle unknown mode gracefully', () => {
        const prompt = getSystemPrompt('unknown-mode', 'test')
        // Should still contain base prompt but no mode-specific content
        expect(prompt).toContain('expert UI/UX prototyping assistant')
        expect(prompt).toContain('Mode: unknown-mode')
      })
    })

    it('should handle empty project ID', () => {
      const prompt = getSystemPrompt('rapid-prototype', '')
      expect(prompt).toContain('Project ID: ')
    })
  })
})
