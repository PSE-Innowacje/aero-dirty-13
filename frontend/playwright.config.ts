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
    /* Use nginx (port 80) which serves both frontend and proxies /api to backend.
       Vite dev server (port 5173) proxy doesn't work when backend runs in Docker
       because port 8000 is not exposed to host. */
    baseURL: 'http://localhost',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  /* No webServer — tests run against docker-compose stack (nginx on port 80).
     Start with: docker-compose up -d */
});
