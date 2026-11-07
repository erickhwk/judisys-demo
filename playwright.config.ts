import { defineConfig, devices } from '@playwright/test'

// Cada agente em paralelo usa a sua porta (PORTA_E2E); com porta fixa e reuseExistingServer,
// um agente testaria o build do outro.
const porta = Number(process.env.PORTA_E2E ?? 4173)
if (!Number.isInteger(porta) || porta < 1024 || porta > 65535) {
  throw new Error(`PORTA_E2E inválida: ${process.env.PORTA_E2E}`)
}

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
    // No CI o seed e o build já rodaram em passos anteriores. Localmente o e2e gera os dois antes:
    // o public/seed.json não é versionado, e um worktree novo nasce sem ele (AJ-06).
    command: process.env.CI
      ? `pnpm preview --port ${porta} --strictPort`
      : `pnpm seed && pnpm build && pnpm preview --port ${porta} --strictPort`,
    url: `http://localhost:${porta}/judisys-demo/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
