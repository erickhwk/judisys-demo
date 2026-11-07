import { defineConfig, devices } from '@playwright/test'

const porta = 4173

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // No CI, além das anotações no PR, gera o HTML que o workflow guarda quando o e2e falha
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${porta}/judisys-demo/`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // No CI o build já rodou num passo anterior; localmente o e2e gera o dist/ antes
    command: process.env.CI
      ? `pnpm preview --port ${porta} --strictPort`
      : `pnpm build && pnpm preview --port ${porta} --strictPort`,
    url: `http://localhost:${porta}/judisys-demo/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
