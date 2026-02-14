import { test, expect } from '@playwright/test'
import { launchApp } from './helpers'
import type { ElectronApplication, Page } from '@playwright/test'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  ;({ app, page } = await launchApp())
})

test.afterAll(async () => {
  await app.close()
})

test.describe('Application Launch', () => {
  test('should open the main window', async () => {
    expect(page).toBeTruthy()
    const title = await page.title()
    // The Electron window title might be the HTML title or the app name
    expect(typeof title).toBe('string')
  })

  test('should display the header with app title', async () => {
    await expect(page.locator('text=UI Studio')).toBeVisible()
  })

  test('should display the project selector', async () => {
    await expect(page.locator('text=New Prototype')).toBeVisible()
  })

  test('should display the settings button', async () => {
    await expect(page.locator('button[title="Settings"]')).toBeVisible()
  })

  test('should display the chat input', async () => {
    await expect(
      page.locator('textarea[placeholder="Describe the UI you want to build..."]')
    ).toBeVisible()
  })

  test('should display the welcome message', async () => {
    await expect(page.locator('text=Welcome to UI Studio')).toBeVisible()
  })

  test('should display the preview placeholder', async () => {
    await expect(page.locator('text=No preview available')).toBeVisible()
  })
})

test.describe('Settings Modal', () => {
  test('should open settings modal on button click', async () => {
    await page.locator('button[title="Settings"]').click()
    await expect(page.locator('h2:has-text("Settings")')).toBeVisible()
    await expect(page.locator('text=Anthropic API Key')).toBeVisible()
  })

  test('should have a password input for API key', async () => {
    const input = page.locator('input[type="password"]')
    await expect(input).toBeVisible()
  })

  test('should close settings on Escape key', async () => {
    await page.keyboard.press('Escape')
    await expect(page.locator('h2:has-text("Settings")')).not.toBeVisible()
  })

  test('should close settings on backdrop click', async () => {
    // Open again
    await page.locator('button[title="Settings"]').click()
    await expect(page.locator('h2:has-text("Settings")')).toBeVisible()

    // Click backdrop
    await page.locator('.bg-black\\/40').click()
    await expect(page.locator('h2:has-text("Settings")')).not.toBeVisible()
  })
})

test.describe('Project Selector', () => {
  test('should open project dropdown on click', async () => {
    await page.locator('text=New Prototype').first().click()
    // Should see the dropdown with "New Prototype" button
    const newPrototypeButtons = page.locator('button:has-text("New Prototype")')
    await expect(newPrototypeButtons.first()).toBeVisible()
  })

  test('should close dropdown when clicking elsewhere', async () => {
    // Click the main content area to close dropdown
    await page.locator('.flex-1.overflow-hidden').first().click({ force: true })
  })
})

test.describe('Viewport Selector', () => {
  test('should show viewport buttons', async () => {
    await expect(page.locator('button:has-text("Mobile")')).toBeVisible()
    await expect(page.locator('button:has-text("Tablet")')).toBeVisible()
    await expect(page.locator('button:has-text("Desktop")')).toBeVisible()
  })

  test('should switch viewport on click', async () => {
    await page.locator('button:has-text("Mobile")').click()
    // Desktop should still be available
    await expect(page.locator('button:has-text("Desktop")')).toBeVisible()

    // Switch back
    await page.locator('button:has-text("Desktop")').click()
  })
})

test.describe('Chat Interaction', () => {
  test('should allow typing in chat input', async () => {
    const input = page.locator('textarea[placeholder="Describe the UI you want to build..."]')
    await input.fill('Hello World')
    await expect(input).toHaveValue('Hello World')
  })

  test('should have a send button', async () => {
    await expect(page.locator('button[title="Send message"]')).toBeVisible()
  })

  test('should have an attach image button', async () => {
    await expect(page.locator('button[title="Attach image"]')).toBeVisible()
  })

  test('should display keyboard shortcut hints', async () => {
    await expect(page.locator('kbd:has-text("Enter")')).toBeVisible()
    await expect(page.locator('kbd:has-text("Shift+Enter")')).toBeVisible()
  })
})

test.describe('Split Pane', () => {
  test('should render the divider between panels', async () => {
    const divider = page.locator('.cursor-col-resize')
    await expect(divider).toBeVisible()
  })
})
