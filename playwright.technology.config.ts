import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['technology-new-preview.spec.ts', 'technology-three-preview.spec.ts'],
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: process.env.TECHNOLOGY_BASE_URL ?? 'http://127.0.0.1:4182',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'technology-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'technology-mobile', use: { ...devices['Pixel 7'] } },
  ],
})
