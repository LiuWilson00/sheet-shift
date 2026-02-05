import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  retries: 0,
  outputDir: './test-results',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
