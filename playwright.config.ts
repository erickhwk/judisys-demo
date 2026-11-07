import { defineConfig, devices } from '@playwright/test'

const porta = 4173

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${porta}/judisys-demo/`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm build && pnpm preview --port ${porta} --strictPort`,
    url: `http://localhost:${porta}/judisys-demo/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
