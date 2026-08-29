import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'line',
  outputDir: '../artifacts/study-game/playwright-live-results',
  use: {
    baseURL: 'https://radiotedu.com/social/',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'live-desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'live-mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
})

