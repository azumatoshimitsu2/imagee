import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.js',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8773/games/d/what_would_you_do/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'python3 -m http.server 8773 --bind 127.0.0.1',
    cwd: fileURLToPath(new URL('../../dist/', import.meta.url)),
    url: 'http://127.0.0.1:8773/games/d/what_would_you_do/data/questions.json',
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
