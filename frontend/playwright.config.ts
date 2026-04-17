import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    /* Local: nginx on port 80 (docker-compose serves frontend + proxies /api)
       CI: Vite on port 5173 (proxies /api to uvicorn on port 8000) */
    baseURL: process.env.CI ? 'http://localhost:5173' : 'http://localhost',
    trace: 'on-first-retry',
    /* Self-signed TLS cert in local docker-compose stack */
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  /* In CI, Playwright starts Vite dev server automatically.
     Locally, tests run against docker-compose stack (nginx on port 80). */
  ...(process.env.CI
    ? {
        webServer: {
          command: 'npm run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: false,
          timeout: 30_000,
        },
      }
    : {}),
});
