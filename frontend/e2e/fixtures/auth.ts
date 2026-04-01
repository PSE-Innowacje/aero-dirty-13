import { test as base, type Page } from '@playwright/test';

/* ------------------------------------------------------------------ */
/*  Seed credentials (must match backend DatabaseSeeder)              */
/* ------------------------------------------------------------------ */

export type Role = 'admin' | 'planner' | 'supervisor' | 'pilot';

export const credentials: Record<Role, { email: string; password: string }> = {
  admin:      { email: 'admin@aero.local',      password: 'admin123' },
  planner:    { email: 'planner@aero.local',     password: 'planner123' },
  supervisor: { email: 'supervisor@aero.local',  password: 'supervisor123' },
  pilot:      { email: 'pilot@aero.local',       password: 'pilot123' },
};

/* ------------------------------------------------------------------ */
/*  Login helper                                                      */
/* ------------------------------------------------------------------ */

async function login(page: Page, role: Role): Promise<void> {
  const { email, password } = credentials[role];

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/hasło|password/i).fill(password);
  await page.getByRole('button', { name: /zaloguj|sign\s*in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'));
}

/* ------------------------------------------------------------------ */
/*  Custom test fixture                                               */
/* ------------------------------------------------------------------ */

type AuthFixtures = {
  loginAs: (role: Role) => Promise<void>;
  authenticatedPage: (role: Role) => Promise<Page>;
};

export const test = base.extend<AuthFixtures>({
  loginAs: async ({ page }, use) => {
    await use(async (role: Role) => {
      await login(page, role);
    });
  },

  authenticatedPage: async ({ browser }, use) => {
    const pages: Page[] = [];

    await use(async (role: Role) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await login(page, role);
      pages.push(page);
      return page;
    });

    // Cleanup: close every context we opened
    for (const p of pages) {
      await p.context().close();
    }
  },
});

export { expect } from '@playwright/test';
