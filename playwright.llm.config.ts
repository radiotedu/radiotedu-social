import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'llm-discoverability.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: 'line',
  timeout: 30_000,
  use: {
    ignoreHTTPSErrors: false,
  },
});
