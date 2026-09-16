import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-base',
  workers: 1,
  timeout: 60_000,
  webServer: {
    command: 'npm --prefix ../base-mission-farm start',
    url: 'http://127.0.0.1:4300/base/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4300',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 960 } },
    },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
  ],
});
