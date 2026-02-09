import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { join } from 'path'

/**
 * Launch the Electron app for E2E testing.
 *
 * Prerequisites:
 *   npm run build   (must build the app before running E2E tests)
 *
 * The app is launched with a test API key environment variable so the agent
 * service initialises without a real key (individual tests can stub responses).
 */
export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [join(__dirname, '..', 'out', 'main', 'index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      // Provide a dummy key so the app doesn't block on missing config
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'sk-ant-test-e2e-placeholder',
    },
  })

  const page = await app.firstWindow()
  // Wait for the renderer to finish loading
  await page.waitForLoadState('domcontentloaded')

  return { app, page }
}
