/**
 * Login E2E tests — authentication flows, role-based redirects, logout.
 *
 * The app uses Polish (pl) as the default language.
 * Auth credentials are managed via the shared auth fixture.
 */
import { test, expect } from './fixtures/auth';

test.describe('Login page', () => {
  test('shows login page with email and password fields', async ({ page }) => {
    await page.goto('/login');

    // Verify the login form is present with branded header
    await expect(page.getByRole('heading', { name: 'AERO' })).toBeVisible();

    // Email field
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');

    // Password field
    const passwordInput = page.getByLabel(/hasło|password/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Submit button (Polish default: "Zaloguj się")
    await expect(
      page.getByRole('button', { name: /zaloguj|sign\s*in/i })
    ).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('admin@aero.local');
    await page.getByLabel(/hasło|password/i).fill('wrong-password-999');
    await page.getByRole('button', { name: /zaloguj|sign\s*in/i }).click();

    // Error message should appear (Polish: "Nieprawidłowy email lub hasło" or generic failure)
    await expect(
      page.locator('text=/nieprawidłow|invalid|nie powiodło|failed/i')
    ).toBeVisible({ timeout: 10_000 });

    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Role-based redirects after login', () => {
  test('admin login lands on dashboard', async ({ page, loginAs }) => {
    await loginAs('admin');

    // Admin lands on the dashboard page
    await page.waitForURL('**/', { timeout: 10_000 });
    await expect(page.locator('main h1', { hasText: /panel operacyjny/i })).toBeVisible({ timeout: 10_000 });
  });

  test('planner login lands on dashboard', async ({ page, loginAs }) => {
    await loginAs('planner');

    // Planner lands on the dashboard page
    await page.waitForURL('**/', { timeout: 10_000 });
    await expect(page.locator('main h1', { hasText: /panel operacyjny/i })).toBeVisible({ timeout: 10_000 });
  });

  test('pilot login lands on dashboard', async ({ page, loginAs }) => {
    await loginAs('pilot');

    // Pilot lands on the dashboard page
    await page.waitForURL('**/', { timeout: 10_000 });
    await expect(page.locator('main h1', { hasText: /panel operacyjny/i })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Logout', () => {
  test('logout returns to login page', async ({ page, loginAs }) => {
    // Login as admin first
    await loginAs('admin');
    await page.waitForURL('**/', { timeout: 10_000 });

    // Find and click the logout button in the sidebar
    // Polish label: "Wyloguj"
    const logoutButton = page.getByRole('button', { name: /wyloguj|log\s*out/i });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Should redirect back to login page
    await page.waitForURL('**/login', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);

    // Token should be cleared from localStorage
    const token = await page.evaluate(() => localStorage.getItem('aero_token'));
    expect(token).toBeFalsy();
  });
});
